"use client";
import { motion, useAnimation, Variants } from "framer-motion";
import { get } from "http";
import { useSearchParams } from "next/navigation";
import { use, useEffect, useState } from "react";

export default function SingleplayerGrid() {
    const searchParams = useSearchParams();
    const inSize = searchParams.get("size");

    useEffect(() => {
        if (!inSize || isNaN(Number(inSize)) || Number(inSize) < 4 || Number(inSize) > 9 || !Number.isInteger(Number(inSize))) {
            window.location.href = "/singleplayer";
        }
    }, [inSize]);
    if (!inSize || isNaN(Number(inSize)) || Number(inSize) < 4 || Number(inSize) > 9 || !Number.isInteger(Number(inSize))) return null;

    const size = Number(inSize);

    type Cell = {
        index: number;
        x: number;
        y: number;
        value: number | "X" | "O" | "-";
        min: number;
        max: number;
        currentVision: {
            horizontal: number;
            vertical: number;
            total: number;
        }
        maxVision: {
            left: number;
            right: number;
            up: number;
            down: number;
        }
        neededForCompletion: boolean;
    }

    const [gridData, setGridData] = useState<Cell[]>([]);

    useEffect(() => {
        const newGrid: Cell[] = Array.from({ length: size * size }, (_, i) => ({
            index: i,
            x: i % size,
            y: Math.floor(i / size),
            value: "-",
            min: 0,
            max: (i % size) + (size - 1 - (i % size)) + (Math.floor(i / size)) + (size - 1 - Math.floor(i / size)),
            currentVision: { horizontal: 0, vertical: 0, total: 0 },
            maxVision: { 
                left: i % size,
                right: size - 1 - (i % size),
                up: Math.floor(i / size),
                down: size - 1 - Math.floor(i / size),
            },
            neededForCompletion: false,
        }));
        const generatedGrid = generateGrid(newGrid);
        setGridData(generatedGrid);
    }, [size]);
    
    

    function generateGrid(grid: Cell[]): Cell[] {
        function getCell(x: number, y: number): Cell | null {
            if (x < 0 || x >= size || y < 0 || y >= size) return null;
            return grid[y * size + x];
        }
        function getCellByIndex(index: number): Cell | null {
            if (index < 0 || index >= size * size) return null;
            return grid[index];
        }
        function getRandomPlaceableCell() {
            const placeableCells = grid.filter(cell => cell.value === "-" || cell.value === "O");
            if (placeableCells.length === 0) return null;
            const randomIndex = Math.floor(Math.random() * placeableCells.length);
            return placeableCells[randomIndex];
        }
        function getRandomCellValue(cell: Cell) {
            const randomValue = cell.min + Math.floor(Math.random() * ((cell.max > size ? size : cell.max) - cell.min + 1));
            return randomValue === 0 ? "X" : randomValue;
        }
        function placeCell(fromCell: Cell, direction: keyof typeof fromCell.maxVision, value: "O" | "X") {
            let targetCell: Cell | null = fromCell;
            
            switch (direction) { // Need to update visions for cells passed through here when the target value is an O
                case "left":
                    targetCell = getCell(targetCell.x - 1, targetCell.y);
                    while (targetCell && targetCell.value === "O") {
                        targetCell = getCell(targetCell.x - 1, targetCell.y);
                    }
                    break;
                case "right":
                    targetCell = getCell(targetCell.x + 1, targetCell.y);
                    while (targetCell && targetCell.value === "O") {
                        targetCell = getCell(targetCell.x + 1, targetCell.y);
                    }
                    break;
                case "up":
                    targetCell = getCell(targetCell.x, targetCell.y - 1);
                    while (targetCell && targetCell.value === "O") {
                        targetCell = getCell(targetCell.x, targetCell.y - 1);
                    }
                    break;
                case "down":
                    targetCell = getCell(targetCell.x, targetCell.y + 1);
                    while (targetCell && targetCell.value === "O") {
                        targetCell = getCell(targetCell.x, targetCell.y + 1);
                    }
                    break;
            }

            if (!targetCell) return false;
            if (targetCell.value === "-") {
                targetCell.value = value;
                return true;
            }
        }
        
        for (let i = 0; i < 1; i++) {
        //while (grid.some(cell => cell.value === "-")) {
            let randomCell = getRandomPlaceableCell();
            if (!randomCell) break;
            randomCell.neededForCompletion = true;
            randomCell.value = getRandomCellValue(randomCell);
            if (randomCell.value === "X") {
                // Other logic here eventually (X can mess with vision stuff)
                continue;
            }

            for (let count = 0; count < (randomCell.value as number) - randomCell.currentVision.total; count++) {
                let directions: (keyof Cell["maxVision"])[] = [];
                for (const direction in randomCell.maxVision) {
                    if (randomCell.maxVision[direction as keyof Cell["maxVision"]] > 0) {
                        directions.push(direction as keyof Cell["maxVision"]);
                    }
                }

                if (directions.length === 0) {
                    console.error("No available directions to place vision for this cell:", randomCell);
                    break;
                }

                console.log(randomCell.value, directions);

                const randomDirIndex = Math.floor(Math.random() * directions.length);
                const direction = directions[randomDirIndex];

                const placed = placeCell(randomCell, direction, "O");
                if (placed) {
                    randomCell.maxVision[direction]--;
                } else {
                    console.error("Failed to place vision cell in direction:", direction, "from cell:", randomCell);
                }
            }

            let directions: (keyof Cell["maxVision"])[] = ["up", "down", "left", "right"];
            for (const direction of directions) {
                const placed = placeCell(randomCell, direction, "X");
            }

        }
        return grid;
    }


    const cellColors = ["--color-zinc-800", "--color-cyan-700", "--color-orange-700"];
    const [colorIndex, setColorIndex] = useState<number[]>([]);
    useEffect(() => {
        if (gridData.length === 0) return;
        setColorIndex(Array.from({ length: size * size }).map((_, index) => {
            if (gridData[index].value == "-") return 0;
            if (gridData[index].value == "X") return 2;
            return 1;
        }));
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

    return (
        <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}>
            {Array.from({ length: size * size }).map((_, index) => (
                <motion.div
                    key={index}
                    custom={index}
                    className={`h-[2.2em] aspect-square font-bold text-gray-300 rounded-[30%] flex items-center justify-center cursor-pointer select-none focus:outline-none`}
                    style={{ fontSize: `${fontSize}em`, backgroundColor: `var(${cellColors[colorIndex[index]]})`,  }}
                    animate={controls}
                    whileHover={animationDone ? "hover" : undefined}
                    whileFocus={animationDone ? "hover" : undefined}
                    variants={gridVariants}
                    whileTap={"tap"}
                    onTap={() => {
                        setColorIndex((prev) => {
                            const newColors = [...prev];
                            newColors[index] = (newColors[index] + 1) % cellColors.length;
                            return newColors;    
                        })
                    }}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        setColorIndex((prev) => {
                            const newColors = [...prev];
                            newColors[index] = (newColors[index] - 1) % cellColors.length;
                            if (newColors[index] < 0) newColors[index] += cellColors.length;
                            return newColors;
                        })
                        
                    }}
                >
                    {gridData[index] && typeof gridData[index].value === "number" ? gridData[index].value : ""}
                </motion.div>
            ))}
        </div>
    );
}