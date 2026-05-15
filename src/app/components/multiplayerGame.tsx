"use client";
import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useSearchParams } from "next/navigation";
import { motion, useAnimation, Variants, AnimatePresence } from "framer-motion";
import { Space_Mono } from "next/font/google";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronRight } from "@fortawesome/free-solid-svg-icons";

const spaceMono = Space_Mono({ subsets: ['latin'], weight: '700' });


export default function MultiplayerGame() {
    const socketRef = useRef<Socket | null>(null);
    const searchParams = useSearchParams();
    const inSizeRaw = searchParams?.get("size");
    const inSize = Number(inSizeRaw);
    useEffect(() => {
        if ((!inSize || isNaN(Number(inSize)) || Number(inSize) < 4 || Number(inSize) > 9 || !Number.isInteger(Number(inSize))) && inSizeRaw !== "any") {
            window.location.href = "/multiplayer";
            return;
        } 

        const init = async () => {
            await fetch('/api/socket');
            socketRef.current = io();

            const savedElo = localStorage.getItem("elo");
            let elo = 1000;
            if (savedElo) {
                elo = Number(savedElo);
            }
            const savedGamesPlayed = localStorage.getItem("multiplayerGamesPlayed");
            let gamesPlayed = 0;
            if (savedGamesPlayed) {
                gamesPlayed = Number(savedGamesPlayed);
            }

            socketRef.current.on("connect", () => {
                //console.log("Connected to server with ID:", socketRef.current?.id);
            });

            socketRef.current.emit("joinQueue", { size: inSizeRaw === "any" ? "any" : inSize, elo: elo, gamesPlayed: gamesPlayed });

            socketRef.current.on("queueJoined", () => {
                if (status !== "connecting") return;
                //console.log("Joined queue, waiting for another player...");
                setStatus(prev => prev === "connecting" ? "waiting" : prev);
            });

            socketRef.current.on("areYouReady", () => {
                setAskedIfReady(true);
            });

            socketRef.current.on("playGame", (data) => {
                //console.log("Received playGame data:", data);
                localStorage.setItem("elo", data.tempElo.toString());
                localStorage.setItem("multiplayerGamesPlayed", data.newGamesPlayed.toString());
                setSize(data.size);
                setGridData(data.grid);
                setStatus("playing");
            });

            socketRef.current.on("otherPlayerFinished", (data) => {
                //console.log("Other player finished with time:", data.finishedTime);
                setOtherPlayerFinishedTime(data.finishedTime);
            });

            socketRef.current.on("gameFinished", (data) => {
                if (gameEnded) return;
                //console.log("Game finished:", data);
                setGameEnded(true);
                setWon(data.won);
                setOtherForfeit(data.otherForfeit);
                localStorage.setItem("elo", data.newElo.toString());
                setNewEloCalc(data.newEloCalculation);
            });
        };

        init();

        return () => {
            socketRef.current?.disconnect();
        };
    
    }, [inSize]);

    type newEloCalculation = { totalDifference: number; baseChange: number; size: number; randomFactor: number; newPlayerMultiplier: boolean; newElo: number; };
    type Statuses = "connecting" | "waiting" | "playing";
    const [status, setStatus] = useState<Statuses>("connecting");
    const [askedIfReady, setAskedIfReady] = useState<boolean>(false);
    const [gameEnded, setGameEnded] = useState<boolean>(false);
    const [won, setWon] = useState<boolean | null>(null);
    const [otherForfeit, setOtherForfeit] = useState<boolean>(false);
    const [newEloCalc, setNewEloCalc] = useState<newEloCalculation | null>(null);
    const [size, setSize] = useState<number>(4);
    const statusMessages: Record<Statuses, string> = {
        "connecting": "Connecting to server...",
        "waiting": "Waiting for another player...",
        "playing": ""
    };

    
    useEffect(() => {
        if (askedIfReady && status === "waiting") {
            socketRef.current?.emit("readyConfirmation", { userId: socketRef.current.id });
            //console.log("Sent ready confirmation to server");
        }
    }, [askedIfReady, status]);

    type Cell = {
        index: number;
        x: number;
        y: number;
        value: number | "X" | "O" | "-";
        completedValue: number | "X" | "O" | "-";
        neededForCompletion: boolean;
    }

    const [gridData, setGridData] = useState<Cell[]>([]);
    const [otherPlayerFinishedTime, setOtherPlayerFinishedTime] = useState<number | null>(null);

    const [elapsed, setElapsed] = useState(0);
    const timerStartedRef = useRef(false);
    const lastTimestampRef = useRef<number | null>(null);

    function startTimer() {
        if (timerStartedRef.current) return;
        timerStartedRef.current = true;
        lastTimestampRef.current = null;
        requestAnimationFrame(updateTimer);
    }

    function updateTimer(timestamp: number) {
        if (!timerStartedRef.current) return;
        if (lastTimestampRef.current !== null) {
            const delta = timestamp - lastTimestampRef.current;
            setElapsed((prev) => prev + delta);
        }

        lastTimestampRef.current = timestamp;
        requestAnimationFrame(updateTimer);
    }

    function stopTimer(completed = true) {
        if (!timerStartedRef.current) return;
        timerStartedRef.current = false;
        //console.log("Stopping timer at elapsed time:", elapsed, " Completed:", completed);
        socketRef.current?.emit("timerStopped", { elapsed: elapsed, gridData: gridData, completed: completed });
    }

    type Direction = "up" | "down" | "left" | "right";

    // Stop timer and report completion to server if the other player completes the grid and their time < yours

    useEffect(() => {
        if (otherPlayerFinishedTime !== null && timerStartedRef.current === true) {
            if (otherPlayerFinishedTime < elapsed) {
                stopTimer(false);
            }
        }
    }, [otherPlayerFinishedTime, elapsed]);

    function checkForCompletion() {
        if (gridData.some(cell => cell.value === "-")) return;
        let completedCorrectly = true;
        for (let i = 0; i < gridData.length; i++) {
            if (gridData[i].value !== gridData[i].completedValue) {
                completedCorrectly = false;
            }
        }

        if (!completedCorrectly) { // Checks for completion while grids are not unique
            function getCell(x: number, y: number): Cell | null {
                if (x < 0 || x >= size || y < 0 || y >= size) return null;
                return gridData[y * size + x];
            }
            for (let i = 1; i < gridData.length; i++) {
                if (typeof(gridData[i].value) === "number") {
                    let totalCount = 0;
                    for (let direction of ["up", "down", "left", "right"] as Direction[]) {
                        let visibleCount = 0;
                        for (let j = 1; j < size; j++) {
                            let xOffset = direction === "left" ? -j : direction === "right" ? j : 0;
                            let yOffset = direction === "up" ? -j : direction === "down" ? j : 0;
                            let targetCell = getCell(gridData[i].x + xOffset, gridData[i].y + yOffset);
                            if (!targetCell || targetCell.value === "X") break;
                            if ((targetCell.value === "O" || typeof targetCell.value === "number")) {
                                visibleCount++;
                            }
                        }
                        totalCount += visibleCount;
                    }
                    if (totalCount !== gridData[i].value) {
                        //console.log("Number cell incorrect:", gridData[i], " expected ", gridData[i].value, " got ", totalCount);
                        return;
                    }
                } else if (gridData[i].value === "O") {
                    let visibleFromNumber = false;
                    for (let direction of ["up", "down", "left", "right"] as Direction[]) {
                        for (let j = 1; j < size; j++) {
                            let xOffset = direction === "left" ? -j : direction === "right" ? j : 0;
                            let yOffset = direction === "up" ? -j : direction === "down" ? j : 0;
                            let targetCell = getCell(gridData[i].x + xOffset, gridData[i].y + yOffset);
                            if (!targetCell || targetCell.value === "X") break;
                            if (typeof targetCell.value === "number") {
                                visibleFromNumber = true;
                                break;
                            }
                        }
                    }
                    if (!visibleFromNumber) {
                        //console.log("O cell not visible from any number cell:", gridData[i]);
                        return;
                    }
                } else if (gridData[i].value === "-") { 
                    //console.log("Empty cell found:", gridData[i]);
                    return;
                }
            }
        }

        stopTimer();
    }

    function clickCell(index: number, type: "left" | "right") {
        if (gridData[index].neededForCompletion || timerStartedRef.current === false) {
            //console.log(gridData[index]);
            return;
        };
        gridData[index].value = (["-", "O", "X"] as const)[(type !== "right" ? ((colorIndex[index] + 1) % cellColors.length) : (((colorIndex[index] - 1) % cellColors.length) < 0 ? cellColors.length - 1 : (colorIndex[index] - 1) % cellColors.length))];
        setColorIndex((prev) => {
            const newColors = [...prev];
            newColors[index] = (type !== "right" ? ((newColors[index] + 1) % cellColors.length) : (((newColors[index] - 1) % cellColors.length) < 0 ? cellColors.length - 1 : (newColors[index] - 1) % cellColors.length));
            return newColors;    
        })

        //console.log(gridData[index]);
        checkForCompletion();
    }

    function formatTime(ms: number): string {
        ms = Math.floor(ms);
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds%3600) / 60);
        const seconds = totalSeconds % 60;

        const msString = (ms % 1000).toString().padStart(3, "0");

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${msString}`;
        }
        if (minutes > 0) {
            return `${minutes}:${seconds.toString().padStart(2, "0")}.${msString}`;
        }
        return `${seconds}.${msString}`;
    }

    const cellColors = ["--empty-cell", "--o-cell", "--x-cell"];
    const [colorIndex, setColorIndex] = useState<number[]>([]);
    useEffect(() => {
        if (gridData.length === 0) return;
        setColorIndex(Array.from({ length: size * size }).map((_, index) => {
            if (gridData[index].value == "-") return 0;
            if (gridData[index].value == "X") return 2;
            return 1;
        }));

        setTimeout(() => {
            startTimer();
        }, ((size*size-1)%size + Math.floor((size*size-1)/size)) * delayTime + 250);

    }, [gridData]);

    const delayTime = -0.0075*size + 0.08;
    let fontSize = (-0.14*size + 2.76).toFixed(2);

    const controls = useAnimation();
    const [animationDone, setAnimationDone] = useState(false);

    useEffect(() => {
        (async () => {
                await controls.start({scale: 0, filter: "brightness(1)", transition:{duration: 0}});
                setAnimationDone(true);
                await controls.start("visible");
                controls.start({scale: 1, filter: "brightness(1)"});
            }
        ) ();
    }, [controls]);

    const gridVariants:Variants = {
        visible: (index) => ({scale:1, filter: "brightness(1)", transition: { type: "spring", stiffness: 200, duration: 0.3, delay: (index%size + Math.floor(index/size)) * delayTime }}),
        hover: { scale: 1.1, y:-8, filter: "brightness(1.2)", transition: { type: "spring", stiffness: 300 }},
        tap: { scale: 1.15, y:-16, transition: { type: "spring", stiffness: 300 }},
    };

    useEffect(() => {
        const handleContextMenu = (e: MouseEvent) => e.preventDefault();
        document.addEventListener("contextmenu", handleContextMenu);
        return () => document.removeEventListener("contextmenu", handleContextMenu);
    }, []);

    const [showBreakdown, setShowBreakdown] = useState(false);

    return (
        <div className="flex flex-col items-center justify-center flex-1">
            {status !== "playing" && !gameEnded && <h1 className="text-4xl p-5 text-center font-bold text-[var(--alt-text)]">{statusMessages[status]}</h1>}
            {status === "playing" && gameEnded === false && (
                <div className="flex flex-col items-center justify-center w-full h-full p-4">
                    <h2 className={`text-4xl font-bold mt-10 mb-3 ${spaceMono.className}`}>
                        {formatTime(elapsed)}
                    </h2>
                    
                    <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}>
                        {Array.from({ length: size * size }).map((_, index) => (
                            <motion.div
                                key={index}
                                custom={index}
                                className={`h-[2.2em] aspect-square font-bold text-[var(--focused-text)] rounded-[30%] flex items-center justify-center cursor-pointer select-none focus:outline-none`}
                                style={{ fontSize: `${fontSize}em`, backgroundColor: `var(${cellColors[colorIndex[index]]})`,  }}
                                animate={controls}
                                whileHover={animationDone ? "hover" : undefined}
                                whileFocus={animationDone ? "hover" : undefined}
                                variants={gridVariants}
                                whileTap={"tap"}
                                onTap={() => {
                                    clickCell(index, "left");
                                }}
                                onContextMenu={() => {
                                    clickCell(index, "right");
                                }}
                            >
                                {gridData[index] && typeof gridData[index].value === "number" ? gridData[index].value : ""}
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}
            {gameEnded === true && (
                <div className="flex flex-col items-center justify-center">
                    <h1 className={`text-5xl font-bold ${otherForfeit ? "mb-2" : "mb-8"}`}>{won ? "You won!" : "You lost!"}</h1>
                    <h1 className="text-3xl font-bold mb-8 text-[var(--alt-text)]">{otherForfeit ? "(By Forfeit)" : ""}</h1>
                    {newEloCalc && (
                        <div className="text-2xl font-bold flex flex-col items-center justify-center">
                            <div>
                                {newEloCalc.newElo} 
                                <span className="ml-2 text-[var(--alt-text)]">
                                    ({newEloCalc.totalDifference > 0 ? "+" : ""}{newEloCalc.totalDifference})
                                </span>
                            </div>
                            
                            <div className="relative">
                                <motion.button className="flex flex-row items-center justify-center text-xl mt-4 gap-3 group focus:outline-none cursor-pointer" onClick={() => setShowBreakdown(prev => !prev)}
                                    initial={{scale: 1}}
                                    whileHover={{scale: 1.05}}
                                    whileFocus={{scale: 1.05}}
                                    whileTap={{scale: 0.95}}
                                    transition={{ type: "spring", stiffness: 150 }}
                                    >
                                        <FontAwesomeIcon icon={faChevronRight} className={`size-5! mb-0.5 text-[var(--unfocused-text)] group-hover:text-[var(--focused-text)] group-focus-visible:text-[var(--focused-text)] transition-all duration-300 ease-in-out ${showBreakdown ? "rotate-90" : "rotate-0"}`}/>
                                    <p className="font-normal text-center text-[var(--unfocused-text)] group-hover:text-[var(--focused-text)] group-focus-visible:text-[var(--focused-text)] transition-colors duration-300 ease-in-out">
                                        Elo Breakdown
                                    </p>
                                </motion.button>
                                <AnimatePresence>
                                    {showBreakdown &&
                                        <motion.div className="text-lg font-normal text-[var(--alt-text)] mt-2 absolute flex-col items-end justify-center w-full"
                                            initial={{height: 0, opacity: 0, marginTop: 0}}
                                            animate={{height: "auto", opacity: 1, marginTop: "0.5rem"}}
                                            exit={{height: 0, opacity: 0, marginTop: 0}}
                                            transition={{ duration: 0.15 }}
                                        >
                                            <div className="flex flex-row items-center justify-between">
                                                <p>Base Change: </p>
                                                <p>{newEloCalc.baseChange > 0 ? "+" : ""}{newEloCalc.baseChange}</p>
                                            </div>
                                            <div className="flex flex-row items-center justify-between">
                                                <p>Random Factor: </p>
                                                <p>{newEloCalc.randomFactor > 0 ? "+" : ""}{newEloCalc.randomFactor}</p>
                                            </div>
                                            <div className="flex flex-row items-center justify-between">
                                                <p>Size Multiplier: </p>
                                                <p>x{newEloCalc.size}</p>
                                            </div>
                                            {newEloCalc.newPlayerMultiplier && 
                                                <div className="flex flex-row items-center justify-between">
                                                    <p>New Player: </p>
                                                    <p>x{won ? "2" : "0.5"}</p>
                                                </div>
                                            }
                                            <div className="flex flex-row items-center justify-between text-[var(--unfocused-text)] mt-1 border-t pt-1">
                                                <p>Total: </p>
                                                <p>{newEloCalc.totalDifference >= 0 ? "+" : ""}{newEloCalc.totalDifference}</p>
                                            </div>
                                        </motion.div>
                                    }
                                </AnimatePresence>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}