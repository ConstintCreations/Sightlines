"use client";
import { motion, useAnimation, Variants } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { useRef, useEffect, useState } from "react";
import { Space_Mono } from 'next/font/google';
import { CellType, Grid } from "./generation/types";
import { generatePuzzleWithSolution } from "./generation/generator";

const spaceMono = Space_Mono({
    subsets: ['latin'],
    weight: ['700'],
    variable: '--font-space-mono',
});

export default function SingleplayerGrid() {
    const searchParams = useSearchParams();
    const inSize = searchParams?.get("size");

    useEffect(() => {
        if (!inSize || isNaN(Number(inSize)) || Number(inSize) < 4 || Number(inSize) > 9 || !Number.isInteger(Number(inSize))) {
            window.location.href = "/singleplayer";
        }
    }, [inSize]);
    if (!inSize || isNaN(Number(inSize)) || Number(inSize) < 4 || Number(inSize) > 9 || !Number.isInteger(Number(inSize))) return null;

    const size = Number(inSize);

    const [grid, setGrid] = useState<Grid>();
    const [emptyGrid, setEmptyGrid] = useState<Grid>();

    useEffect(() => {
        const generatedGrid = generatePuzzleWithSolution(size);
        setGrid(generatedGrid.grid);
        setEmptyGrid(generatedGrid.grid.CloneGrid());
    }, [size]);
    

    const [savedBestTime, setSavedBestTime] = useState<number>(0);

    useEffect(() => {
        const stored = localStorage.getItem(`singleplayer-best-${size}`);
        const best = stored && !isNaN(Number(stored)) ? Number(stored) : 0;
        setSavedBestTime(best);
    }, [size]);



    function checkForCompletion() {
        if (!grid) return;
        if (!grid.IsSameAsSolvedGrid()) return;

        timerStartedRef.current = false;
        if (savedBestTime === 0 || elapsed < savedBestTime) {
            localStorage.setItem(`singleplayer-best-${size}`, elapsed.toString());
        }
        let score = Number(localStorage.getItem("score"));
        if (!score || isNaN(score)) {
            score = 0;
        }
        score += size*size;
        localStorage.setItem("score", score.toString());
        setTimeout(() => {
            location.href = `/singleplayer`;
        }, 1000);
    }

    useEffect(() => {
        const handleContextMenu = (e: MouseEvent) => e.preventDefault();
        document.addEventListener("contextmenu", handleContextMenu);
        return () => document.removeEventListener("contextmenu", handleContextMenu);
    }, []);
    
    function clickCell(index: number, type: "left" | "right") {
        if (emptyGrid?.getCellByIndex(index)?.type == CellType.Blocker || emptyGrid?.getCellByIndex(index)?.type == CellType.Value || timerStartedRef.current === false) {
            //console.log(emptyGrid?.getCellByIndex(index));
            return;
        };
        if (!grid) return;
        const cell = grid.getCellByIndex(index);
        if (!cell) return;
        cell.type = ([CellType.None, CellType.Vision, CellType.Blocker] as const)[(type !== "right" ? ((colorIndex[index] + 1) % cellColors.length) : (((colorIndex[index] - 1) % cellColors.length) < 0 ? cellColors.length - 1 : (colorIndex[index] - 1) % cellColors.length))];
        setColorIndex((prev) => {
            const newColors = [...prev];
            newColors[index] = (type !== "right" ? ((newColors[index] + 1) % cellColors.length) : (((newColors[index] - 1) % cellColors.length) < 0 ? cellColors.length - 1 : (newColors[index] - 1) % cellColors.length));
            return newColors;    
        })

        //console.log(grid?.getCellByIndex(index));
        checkForCompletion();
    }

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
        if (grid?.cells.length === 0) return;
        setColorIndex(Array.from({ length: size * size }).map((_, index) => {
            //console.log(index);
            //console.log(grid?.getCellByIndex(index));
            if (grid?.getCellByIndex(index)?.type == CellType.None) return 0;
            if (grid?.getCellByIndex(index)?.type == CellType.Blocker) return 2;
            return 1;
        }));

        setTimeout(() => {
            startTimer();
        }, ((size*size-1)%size + Math.floor((size*size-1)/size)) * delayTime + 250);

    }, [grid]);

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

    return (
        <div className="flex flex-col items-center justify-center w-full h-full p-4">
            <h2 className={`text-4xl font-bold mt-10 mb-3 ${spaceMono.className}`}>
                {formatTime(elapsed)}
            </h2>
            { savedBestTime > 0 ? 
            
            <h2 className={`text-3xl font-bold mb-5 ${spaceMono.className}`}>
                Best: {formatTime(savedBestTime)}
            </h2> : null

            }
            
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
                        {grid && grid.getCellByIndex(index)?.type === CellType.Value ? grid.getCellByIndex(index)?.value : ""}
                    </motion.div>
                ))}
            </div>
        </div>
    );
}