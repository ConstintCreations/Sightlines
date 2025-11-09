"use client";
import { motion, useAnimation, Variants } from "framer-motion";
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
        playValue: number | "X" | "O" | "-";
        value: number | "X" | "O" | "-";
        min: number;
        max: number;
    deniedValues: { up: number[]; down: number[]; left: number[]; right: number[] };
        currentVision: {
            left: number;
            right: number;
            up: number;
            down: number;
            total: number;
        }
        maxVision: {
            left: number;
            right: number;
            up: number;
            down: number;
            total: number;
        }
        neededForCompletion: boolean;
    }

    const [gridData, setGridData] = useState<Cell[]>([]);

    useEffect(() => {
        const newGrid: Cell[] = Array.from({ length: size * size }, (_, i) => ({
            index: i,
            x: i % size,
            y: Math.floor(i / size),
            playValue: "-",
            value: "-",
            min: 0,
            max: (i % size) + (size - 1 - (i % size)) + (Math.floor(i / size)) + (size - 1 - Math.floor(i / size)),
            deniedValues: { up: [], down: [], left: [], right: [] },
            currentVision: { left: 0, right: 0, up: 0, down: 0, total: 0 },
            maxVision: { 
                left: i % size,
                right: size - 1 - (i % size),
                up: Math.floor(i / size),
                down: size - 1 - Math.floor(i / size),
                total: (i % size) + (size - 1 - (i % size)) + (Math.floor(i / size)) + (size - 1 - Math.floor(i / size)),
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
            const possibleValues = [];
            for (const direction of ["up", "down", "left", "right"] as const) { // Rework possible values to temporarily treat denied values as an X in that direction
                if (cell.deniedValues[direction].length > 0) {
                    cell.maxVision[direction] = 0;
                    cell.maxVision.total = cell.maxVision.up + cell.maxVision.down + cell.maxVision.left + cell.maxVision.right;
                    cell.min = cell.currentVision.total;
                    cell.max = cell.maxVision.total + cell.currentVision.total;
                }
            }
            for (let val = cell.min; val <= (cell.max > size ? size : cell.max); val++) { 
                possibleValues.push(val);
            }
            if (possibleValues.length === 0) return "X";
            const randomValue = possibleValues[Math.floor(Math.random() * possibleValues.length)];
            return randomValue === 0 ? "X" : randomValue;
        }
        function placeCell(fromCell: Cell, direction: keyof typeof fromCell.maxVision, value: "O" | "X") {
            let targetCell: Cell | null = fromCell;

            const xOffset = direction === "left" ? -1 : direction === "right" ? 1 : 0;
            const yOffset = direction === "up" ? -1 : direction === "down" ? 1 : 0;

            function updateOCellVision(cell : Cell) {
                if (!cell) return;
                cell.currentVision[direction] = fromCell.currentVision[direction]+1;
                if (direction === "left" || direction === "right") {
                    cell.maxVision.right = 0;
                    cell.maxVision.left = 0;
                } else {
                    cell.maxVision.up = 0;
                    cell.maxVision.down = 0;
                }
                cell.maxVision.total = cell.maxVision.up + cell.maxVision.down + cell.maxVision.left + cell.maxVision.right;
                cell.currentVision.total = cell.currentVision.up + cell.currentVision.down + cell.currentVision.left + cell.currentVision.right;
                cell.min = cell.currentVision.total;
                cell.max = cell.maxVision.total + cell.currentVision.total;
            }
            
            targetCell = getCell(targetCell.x + xOffset, targetCell.y + yOffset);
            if (value === "X") {
                while (targetCell && (targetCell.value === "O" || typeof targetCell.value === "number")) {
                    targetCell = getCell(targetCell.x + xOffset, targetCell.y + yOffset);
                }

                if (targetCell) {
                    targetCell.value = "X";
                    return true;
                } else {
                    return false;
                }
            }
            if (targetCell) updateOCellVision(targetCell);
            let maxTimes = fromCell.currentVision[direction];
            for (let times = 0; times < maxTimes; times++) {
                if(targetCell && targetCell.value === "O" && times < maxTimes) {
                    targetCell = getCell(targetCell.x + xOffset, targetCell.y + yOffset);
                    if (targetCell) updateOCellVision(targetCell);
                } else if (targetCell) {
                    if (targetCell.value === "O") {
                        targetCell = getCell(targetCell.x + xOffset, targetCell.y + yOffset);
                        if (targetCell) updateOCellVision(targetCell);
                        if (value === "O") {
                            return true;
                        };
                    }
                }
            }

            if (!targetCell) return false;
            if (targetCell.value === "-") {
                targetCell.value = value;
                return true;
            }
        }
        function updateEmptyCellsVision() {
            for (const cell of grid) {
                if (cell.value !== "-") continue;
                let nonContiguousOs: { gapDistance: number, direction: keyof Cell["maxVision"] }[] = [];
                cell.currentVision = { up: 0, down: 0, left: 0, right: 0, total: 0 };
                cell.maxVision = { left: 0, right: 0, up: 0, down: 0, total: 0 };
                for (const direction of ["left", "right", "up", "down"] as const) {
                    let targetCell: Cell | null = cell;

                    const xOffset = direction === "left" ? -1 : direction === "right" ? 1 : 0;
                    const yOffset = direction === "up" ? -1 : direction === "down" ? 1 : 0;

                    let contiguous = true;
                    let gapDistance = 0;

                    targetCell = getCell(targetCell.x + xOffset, targetCell.y + yOffset);
                    while (targetCell && targetCell.value !== "X") {
                        if (typeof targetCell.value === "number") {
                            console.error("Unexpected number cell when updating empty cells' vision:", cell, targetCell);
                        }
                        if (targetCell.value === "O" && contiguous) {
                            cell.currentVision[direction]++;
                            cell.currentVision.total++;
                            cell.min = cell.currentVision.total;
                            cell.max = cell.maxVision.total + cell.currentVision.total;
                        } else if (targetCell.value === "-") {
                            contiguous = false;
                            cell.maxVision[direction]++;
                            cell.maxVision.total++;
                            cell.min = cell.currentVision.total;
                            cell.max = cell.maxVision.total + cell.currentVision.total;
                            gapDistance++;
                        } else if (targetCell.value === "O" && !contiguous) {
                            nonContiguousOs.push({ gapDistance, direction });
                            cell.maxVision[direction]++;
                            cell.maxVision.total++;
                            cell.min = cell.currentVision.total;
                            cell.max = cell.maxVision.total + cell.currentVision.total;
                        }

                        targetCell = getCell(targetCell.x + xOffset, targetCell.y + yOffset);
                    }
                }

                cell.min = cell.currentVision.total;
                cell.max = cell.currentVision.total + cell.maxVision.total;

                if (nonContiguousOs.length > 0) {
                    cell.deniedValues = { up: [], down: [], left: [], right: [] };

                    const gapsByDir: Record<string, number[]> = { up: [], down: [], left: [], right: [] };
                    for (const n of nonContiguousOs) {
                        gapsByDir[n.direction].push(n.gapDistance);
                    }

                    for (const dir of ["up", "down", "left", "right"] as const) {
                        const gaps = gapsByDir[dir];
                        if (gaps.length === 0) continue;

                        const limit = Math.min(gaps.length, 20);
                        const totalMasks = 1 << limit;
                        const deniedSet = new Set<number>();

                        for (let mask = 1; mask < totalMasks; mask++) {
                            let sum = 0;
                            for (let b = 0; b < limit; b++) {
                                if (mask & (1 << b)) sum += gaps[b];
                            }
                            const impossible = sum + cell.min;
                            if (impossible >= cell.min && impossible < size) {
                                deniedSet.add(impossible);
                            }
                        }

                        cell.deniedValues[dir as keyof typeof cell.deniedValues] = Array.from(deniedSet).sort((a, b) => a - b);
                        let tx = cell.x;
                        let ty = cell.y;
                        const xOffset = dir === "left" ? -1 : dir === "right" ? 1 : 0;
                        const yOffset = dir === "up" ? -1 : dir === "down" ? 1 : 0;

                        while (true) {
                            tx += xOffset;
                            ty += yOffset;
                            const t = getCell(tx, ty);
                            if (!t || t.value === "X") break;
                            for (const denied of deniedSet) {
                                if (!t.deniedValues[dir].includes(denied)) {
                                    t.deniedValues[dir].push(denied);
                                }
                            }
                        }
                    }
                }
            }
        }
        
        //for (let i = 0; i < 3; i++) {
        while (grid.some(cell => cell.value === "-")) {
            let randomCell = getRandomPlaceableCell();
            if (!randomCell) break;
            randomCell.neededForCompletion = true;

            randomCell.value = getRandomCellValue(randomCell);
            if (randomCell.value === "X") {
                updateEmptyCellsVision();
                console.log("Placed an X cell, skipping vision placement for this cell:", randomCell);
                continue;
            }

            console.log("Placed cell " + randomCell.value + " at " + `(${randomCell.x}, ${randomCell.y})` + " :", randomCell);

            const placeTimes = (randomCell.value as number) - randomCell.currentVision.total;
            for (let count = 0; count < placeTimes; count++) {

                let directions: (keyof Cell["maxVision"])[] = []; 
                for (const direction of ["left", "right", "up", "down"] as const) {
                    if (randomCell.maxVision[direction as keyof Cell["maxVision"]] > 0) {
                        // Need to check if count is high enough to place in a direction of deniedValues and update accordingly
                        if (!randomCell.deniedValues[direction as keyof typeof randomCell.deniedValues].includes(randomCell.currentVision[direction] + 1)) {
                            directions.push(direction as keyof Cell["maxVision"]);
                        }
                    }
                }

                if (directions.length === 0) {
                    console.error("No available directions to place vision for this cell:", randomCell);
                    break;
                }

                const randomDirIndex = Math.floor(Math.random() * directions.length);
                const direction = directions[randomDirIndex];

                const placed = placeCell(randomCell, direction, "O");
                if (placed) {
                    console.log("Placed vision cell in direction", direction, "from cell:", randomCell);
                    randomCell.maxVision[direction]--;
                    randomCell.currentVision[direction]++;
                    randomCell.currentVision.total = randomCell.currentVision.up + randomCell.currentVision.down + randomCell.currentVision.left + randomCell.currentVision.right;
                } else {
                    console.error("Failed to place vision cell in direction", direction, "from cell:", randomCell);
                }
            }

            let directions: (keyof Cell["maxVision"])[] = ["up", "down", "left", "right"];
            for (const direction of directions) {
                const placed = placeCell(randomCell, direction, "X");
                if (placed) {
                    console.log("Placed blocking X cell in direction", direction, "from cell:", randomCell);
                }
            }

            randomCell.maxVision = { left: 0, right: 0, up: 0, down: 0, total: 0 };
            updateEmptyCellsVision();
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
                            if (gridData[index].neededForCompletion) return prev;
                            const newColors = [...prev];
                            const nextValue = (newColors[index] + 1) % cellColors.length;
                            newColors[index] = nextValue;
                            gridData[index].playValue = (["-", "O", "X"] as const)[nextValue];
                            console.log(gridData[index]);
                            return newColors;    
                        })
                    }}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        setColorIndex((prev) => {
                            console.log(gridData[index]);
                            if (gridData[index].neededForCompletion) return prev;
                            const newColors = [...prev];
                            const nextValue = ((newColors[index] - 1) % cellColors.length) < 0 ? cellColors.length - 1 : (newColors[index] - 1) % cellColors.length;
                            newColors[index] = nextValue;
                            gridData[index].playValue = (["-", "O", "X"] as const)[nextValue];
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