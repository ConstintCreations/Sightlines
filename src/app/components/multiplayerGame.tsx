"use client";
import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useSearchParams } from "next/navigation";
import { motion, useAnimation, Variants } from "framer-motion";
import { Space_Mono } from "next/font/google";

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
                console.log("Connected to server with ID:", socketRef.current?.id);
            });

            socketRef.current.emit("joinQueue", { size: inSizeRaw === "any" ? "any" : inSize, elo: elo, gamesPlayed: gamesPlayed });

            socketRef.current.on("queueJoined", () => {
                setStatus("waiting");
            });

            socketRef.current.on("playGame", (data) => {
                localStorage.setItem("elo", data.tempElo.toString());
                localStorage.setItem("multiplayerGamesPlayed", data.newGamesPlayed.toString());
                setGridData(data.grid);
                setSize(data.size);
                setStatus("playing");
            });

            socketRef.current.on("otherPlayerFinished", (data) => {
                setOtherPlayerFinishedTime(data.finishedTime);
            });

            socketRef.current.on("gameFinished", (data) => {
                if (gameEnded) return;
                setGameEnded(true);
                setWon(data.won);
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
    const [gameEnded, setGameEnded] = useState<boolean>(false);
    const [won, setWon] = useState<boolean | null>(null);
    const [newEloCalc, setNewEloCalc] = useState<newEloCalculation | null>(null);
    const [size, setSize] = useState<number>(4);
    const statusMessages: Record<Statuses, string> = {
        "connecting": "Connecting to server...",
        "waiting": "Waiting for another player...",
        "playing": ""
    };

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
            // Check if other player has finished and send time to server
            if (otherPlayerFinishedTime !== null && elapsed + delta >= otherPlayerFinishedTime) {
                stopTimer(false);
                return;
            }
        }

        lastTimestampRef.current = timestamp;
        requestAnimationFrame(updateTimer);
    }

    function stopTimer(completed = true) {
        timerStartedRef.current = false;
        socketRef.current?.emit("timerStopped", { elapsed: elapsed, gridData: gridData, completed: completed });
    }

    type Direction = "up" | "down" | "left" | "right";


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

    return (
        <div className="flex flex-col items-center justify-center flex-1">
            {status !== "playing" && <h1 className="text-6xl font-bold">{statusMessages[status]}</h1>}
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
                <div>
                    <h1 className="text-5xl font-bold mb-4">{won ? "You won!" : "You lost!"}</h1>
                    {newEloCalc && (
                        <div className="text-xl">
                            {newEloCalc.newElo}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}