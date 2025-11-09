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

    type Direction = "up" | "down" | "left" | "right";
    type VisionPattern = { [direction in Direction]: { maxVisible: number; currentVisible: number; gapDistances: number[]; deniedValues: number[]; }; };
    type PatternLayout = { index: number; x: number; y: number; completedValue: number | "X" | "O" | "-"; desiredValue: number | "X" | "O" | "-"};
    type Pattern = PatternLayout[];

    type Cell = {
        index: number;
        x: number;
        y: number;
        value: number | "X" | "O" | "-";
        completedValue: number | "X" | "O" | "-";
        patterns: Record<number, Pattern[]>;
        neededForCompletion: boolean;
        placeable: boolean;
    }

    const [gridData, setGridData] = useState<Cell[]>([]);

    useEffect(() => {
        const newGrid: Cell[] = Array.from({ length: size * size }, (_, i) => ({
            index: i,
            x: i % size,
            y: Math.floor(i / size),
            value: "-",
            completedValue: "-",
            patterns: {},
            neededForCompletion: false,
            placeable: true,
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
            let placeableCells = grid.filter(cell => cell.placeable && cell.completedValue === "-");
            if (placeableCells.length > Math.round(size/1.5)) placeableCells = grid.filter(cell => cell.placeable && (cell.completedValue === "-" || cell.completedValue === "O"));
            if (placeableCells.length === 0) return null;
            const randomIndex = Math.floor(Math.random() * placeableCells.length);
            return placeableCells[randomIndex];
        }
        function generatePossiblePatternsForCell(cell: Cell) {
            function getDirectionalVisions() {
                let directionalVisions : VisionPattern = {
                    up: { maxVisible: 0, currentVisible: 0, gapDistances: [], deniedValues: [] },
                    down: { maxVisible: 0, currentVisible: 0, gapDistances: [], deniedValues: [] },
                    left: { maxVisible: 0, currentVisible: 0, gapDistances: [], deniedValues: [] },
                    right: { maxVisible: 0, currentVisible: 0, gapDistances: [], deniedValues: [] },
                }

                for (let direction of ["up", "down", "left", "right"] as Direction[]) {
                    let contiguous = true;
                    let blankDistances:number[] = [];
                    for (let i = 1; i < size; i++) {
                        let xOffset = direction === "left" ? -i : direction === "right" ? i : 0;
                        let yOffset = direction === "up" ? -i : direction === "down" ? i : 0;
                        let targetCell = getCell(cell.x + xOffset, cell.y + yOffset);
                        if (!targetCell || targetCell.completedValue === "X") break;
                        if ((targetCell.completedValue === "O" || typeof targetCell.completedValue === "number") && contiguous) {
                            directionalVisions[direction].currentVisible++;
                            directionalVisions[direction].maxVisible++;
                        } else if (targetCell.completedValue === "-") {
                            directionalVisions[direction].maxVisible++;
                            contiguous = false;
                            blankDistances.push(Math.abs(xOffset) + Math.abs(yOffset));
                        } else if ((targetCell.completedValue === "O" || typeof targetCell.completedValue === "number") && !contiguous) {
                            directionalVisions[direction].maxVisible++;
                            directionalVisions[direction].gapDistances = blankDistances.slice();
                        }
                    }
                    for (let gapDistanceValue of directionalVisions[direction].gapDistances) {
                        if (!directionalVisions[direction].gapDistances.includes(gapDistanceValue + 1) && gapDistanceValue !== directionalVisions[direction].maxVisible) {
                            directionalVisions[direction].deniedValues.push(gapDistanceValue);
                        }
                    }
                }

                return directionalVisions;
            }
            function getAllowedValuesInDirections(directionalVisionPattern: VisionPattern) {
                let allowedValuesPerDirection: { [direction in Direction]: number[] } = {
                    up: [],
                    down: [],
                    left: [],
                    right: [],
                };
                for (let direction of ["up", "down", "left", "right"] as Direction[]) {
                    for (let val = directionalVisionPattern[direction].currentVisible + 1; val <= directionalVisionPattern[direction].maxVisible; val++) {
                        if (!directionalVisionPattern[direction].deniedValues.includes(val)) {
                            allowedValuesPerDirection[direction].push(val);
                        }
                    }
                }

                return allowedValuesPerDirection;
            }

            if (cell.completedValue === "-") {
                cell.patterns[0] = [[{ index: cell.index, x: cell.x, y: cell.y, completedValue: "-", desiredValue: "X" }]];
            }

            let directionalVisions = getDirectionalVisions();
            let allowedValuesInDirections = getAllowedValuesInDirections(directionalVisions);
            let min = directionalVisions.up.currentVisible + directionalVisions.down.currentVisible + directionalVisions.left.currentVisible + directionalVisions.right.currentVisible;
            let max = directionalVisions.up.maxVisible + directionalVisions.down.maxVisible + directionalVisions.left.maxVisible + directionalVisions.right.maxVisible;
            console.log(allowedValuesInDirections, directionalVisions, min, max);
            if (min > size && cell.completedValue !== "-") {
                cell.placeable = false;
                return;
            }
            let minPatterns: Pattern[] = [];
            for (let direction of ["up", "down", "left", "right"] as Direction[]) {
                for (let i = 0; i < directionalVisions[direction].currentVisible; i++) {
                    let x = cell.x + (direction === "left" ? -(i+1) : direction === "right" ? (i+1) : 0);
                    let y = cell.y + (direction === "up" ? -(i+1) : direction === "down" ? (i+1) : 0);
                    const targetCell = getCell(x, y);
                    if (!targetCell) {
                        console.error("Target cell not found in min pattern generation at ", x, y);
                        continue;
                    };
                    if (targetCell.completedValue === "O" || typeof targetCell.completedValue === "number") {
                        minPatterns.push([{ index: targetCell.index, x: targetCell.x, y: targetCell.y, completedValue: targetCell.completedValue, desiredValue: targetCell.completedValue }]);
                    } else if (targetCell.completedValue === "-") {
                        minPatterns.push([{ index: targetCell.index, x: targetCell.x, y: targetCell.y, completedValue: targetCell.completedValue, desiredValue: "O" }]);
                    } else if (targetCell.completedValue === "X") {
                        console.error("Unexpected 'X' cell in min pattern generation at ", x, y);
                    }
                }
            }

            for (let i = min; i <= (max > size ? size : max); i++) {
                let extraVision = i-min;
                let patternsForValueI: Pattern[] = [];
                
                function generatePatterns(allowedDirections: Direction[], remainingVision: number, combination: Record<Direction, number>) {
                    if (allowedDirections.length === 0) {
                        if (remainingVision === 0) {
                            const fullPatternMap: Record<number, PatternLayout> = {};

                            for (const minPattern of minPatterns) {
                                for (const patternCell of minPattern) {
                                    fullPatternMap[patternCell.index] = patternCell;
                                }
                            }

                            function getFirstVisibleCellsUpTo(total: number, direction: Direction): PatternLayout[] {
                                const patternCell: PatternLayout[] = [];
                                let count = 0;
                                for (let step = 1; ; step++) {
                                    const x = cell.x + (direction === "left" ? -step : direction === "right" ? step : 0);
                                    const y = cell.y + (direction === "up" ? -step : direction === "down" ? step : 0);
                                    const targetCell = getCell(x, y);
                                    if (!targetCell || targetCell.completedValue === "X") break;
                                    count++;
                                    if (count <= total) {
                                        patternCell.push({ index: targetCell.index,x: targetCell.x, y: targetCell.y, completedValue: targetCell.completedValue, desiredValue: targetCell.completedValue === "-" ? "O" : targetCell.completedValue});
                                    }
                                    if (count >= total) break;
                                }
                                return patternCell;
                            }

                            for (const direction of ["up", "down", "left", "right"] as Direction[]) {
                                const chosenTotal = combination[direction]; 
                                if (typeof chosenTotal !== "number") continue;

                                const cellsToAdd = getFirstVisibleCellsUpTo(chosenTotal, direction);
                                for (const patternCell of cellsToAdd) {
                                    fullPatternMap[patternCell.index] = patternCell;
                                }
                            }

                            const maxDistance: Record<Direction, number> = { up: 0, down: 0, left: 0, right: 0 };
                            for (const indexString of Object.keys(fullPatternMap)) {
                                const patternCell = fullPatternMap[Number(indexString)];
                                if (patternCell.x === cell.x) {
                                    if (patternCell.y < cell.y) maxDistance.up = Math.max(maxDistance.up, cell.y - patternCell.y);
                                    if (patternCell.y > cell.y) maxDistance.down = Math.max(maxDistance.down, patternCell.y - cell.y);
                                }
                                if (patternCell.y === cell.y) {
                                    if (patternCell.x < cell.x) maxDistance.left = Math.max(maxDistance.left, cell.x - patternCell.x);
                                    if (patternCell.x > cell.x) maxDistance.right = Math.max(maxDistance.right, patternCell.x - cell.x);
                                }
                            }

                            const bookendOffsets: Record<Direction, [number, number]> = {
                                up: [0, -(maxDistance.up + 1)],
                                down: [0, maxDistance.down + 1],
                                left: [-(maxDistance.left + 1), 0],
                                right: [maxDistance.right + 1, 0],
                            };

                            for (const direction of ["up", "down", "left", "right"] as Direction[]) {
                                const [xOffset, yOffset] = bookendOffsets[direction];
                                const targetCell = getCell(cell.x + xOffset, cell.y + yOffset);
                                if (!targetCell) continue;
                                if (!fullPatternMap[targetCell.index]) {
                                    if (targetCell.completedValue === "O" || typeof targetCell.completedValue === "number") {
                                        continue;
                                    }
                                    fullPatternMap[targetCell.index] = {
                                        index: targetCell.index,
                                        x: targetCell.x,
                                        y: targetCell.y,
                                        completedValue: targetCell.completedValue,
                                        desiredValue: "X"
                                    };
                                }
                            }

                            patternsForValueI.push(Object.values(fullPatternMap));
                        }
                        return;
                    }

                    const direction = allowedDirections[0];
                    const otherDirections = allowedDirections.slice(1);

                    const current = directionalVisions[direction].currentVisible;
                    const allowedTotals = [current, ...(allowedValuesInDirections[direction] ?? [])].filter((v, idx, arr) => arr.indexOf(v) === idx);

                    const minPossibleForOthers = otherDirections.reduce((acc, d) => acc + directionalVisions[d].currentVisible, 0);

                    for (const chosenTotal of allowedTotals) {
                        if (chosenTotal < current) continue;
                        if (chosenTotal > directionalVisions[direction].maxVisible) continue;

                        const usedExtra = (chosenTotal - current);
                        if (usedExtra > remainingVision) continue;

                        combination[direction] = chosenTotal;
                        generatePatterns(otherDirections, remainingVision - usedExtra, combination);
                        combination[direction] = 0;
                    }
                }

                generatePatterns(["up", "down", "left", "right"], extraVision, { up: 0, down: 0, left: 0, right: 0 });

                cell.patterns[i] = patternsForValueI;
            }
            
            //console.log("Generated patterns for cell at " + `(${cell.x}, ${cell.y})` + " :", cell.patterns);
        }
        function getRandomCellValue(cell: Cell) {
            const keys = Object.keys(cell.patterns).map(Number).filter(k => Array.isArray(cell.patterns[k]) && cell.patterns[k].length > 0);

            if (keys.length === 0) {
                console.warn("No valid patterns found for cell", cell);
                return "X";
            }

            const randomValue = keys[Math.floor(Math.random() * keys.length)];
            return randomValue === 0 ? "X" : randomValue;
        }
        function placeCellsAccordingToRandomlyGeneratedPattern(cell: Cell) {
            const patternsForCell = cell.patterns[cell.completedValue as number];
            if (!patternsForCell || patternsForCell.length === 0) {
                console.error("No patterns found for cell at ", cell.x, cell.y, " with value ", cell.completedValue);
                return;
            }
            const randomPattern = patternsForCell[Math.floor(Math.random() * patternsForCell.length)];
            for (const patternCell of randomPattern) {
                const targetCell = getCellByIndex(patternCell.index!);
                if (!targetCell) {
                    console.error("Target cell not found in pattern placement at ", patternCell.x, patternCell.y);
                    continue;
                };
                targetCell.completedValue = patternCell.desiredValue;
                console.log("Placed pattern cell " + patternCell.desiredValue + " at " + `(${patternCell.x}, ${patternCell.y})` + " :", targetCell);
            }
            
        }
        
        //for (let i = 0; i < 1; i++) {
        while (grid.some(cell => cell.completedValue === "-")) {
            let randomCell = getRandomPlaceableCell();
            if (!randomCell) break;
            generatePossiblePatternsForCell(randomCell);
            if (randomCell.placeable && Object.keys(randomCell.patterns).length !== 0) {
                randomCell.neededForCompletion = true;
                randomCell.completedValue = getRandomCellValue(randomCell);
                randomCell.value = randomCell.completedValue;
                if (randomCell.completedValue === "X") {
                    console.log("Placed an X cell, skipping vision placement for this cell:", randomCell);
                    continue;
                }
                
                console.log("Placed cell " + randomCell.completedValue + " at " + `(${randomCell.x}, ${randomCell.y})` + " :", randomCell);

                placeCellsAccordingToRandomlyGeneratedPattern(randomCell);
            } else {
                randomCell.placeable = false;
                console.log("Marked a cell as non-placeable:", randomCell);
            }
        }
        return grid;
    }


    const cellColors = ["--color-zinc-800", "--color-cyan-700", "--color-orange-700"];
    const [colorIndex, setColorIndex] = useState<number[]>([]);
    useEffect(() => {
        if (gridData.length === 0) return;
        setColorIndex(Array.from({ length: size * size }).map((_, index) => {
            if (gridData[index].completedValue == "-") return 0;
            if (gridData[index].completedValue == "X") return 2;
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
                            gridData[index].completedValue = (["-", "O", "X"] as const)[nextValue];
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
                            gridData[index].completedValue = (["-", "O", "X"] as const)[nextValue];
                            return newColors;
                        })
                        
                    }}
                >
                    {gridData[index] && typeof gridData[index].completedValue === "number" ? gridData[index].completedValue : ""}
                </motion.div>
            ))}
        </div>
    );
}