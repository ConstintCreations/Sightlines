"use client";
import { motion, useAnimation, Variants } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { useRef, useEffect, useState } from "react";
import { Space_Mono } from 'next/font/google';

const spaceMono = Space_Mono({
    subsets: ['latin'],
    weight: ['700'],
    variable: '--font-space-mono',
});

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
            //console.log(allowedValuesInDirections, directionalVisions, min, max);
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
                //console.log("Placed pattern cell " + patternCell.desiredValue + " at " + `(${patternCell.x}, ${patternCell.y})` + " :", targetCell);
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
                    //console.log("Placed an X cell, skipping vision placement for this cell:", randomCell);
                    continue;
                }
                
                //console.log("Placed cell " + randomCell.completedValue + " at " + `(${randomCell.x}, ${randomCell.y})` + " :", randomCell);

                placeCellsAccordingToRandomlyGeneratedPattern(randomCell);
            } else {
                randomCell.placeable = false;
                //console.log("Marked a cell as non-placeable:", randomCell);
            }
        }

        // Solver to ensure unique solution
        function ensureUniqueSolution(grid: Cell[]): Cell[] | null {
            let solverGrid:Cell[] = grid.map(cell => ({ ...cell }));
            function tryPlaceVisionsForCell(cell: Cell): "forced" | "success" | "failure" {
                // Vision placement logic here
                return "success";
            }
            function gridFull(): boolean {
                if (solverGrid.some(cell => cell.value === "-")) return false;
                return true;
            }
            /* 
                for every number cell, from top left to bottom right, do this:
                    value = cell value
                    try to place in directions as far from how they are placed in the generated grid as possible
                    if can't place according to value, backtrack to previous (non forced) cell and try again
                    a cell is forced if there is only one possible way to place its visions
                if reach the end, we have a solution 
                if this solution is different from the generated grid, we change the first differing cell in the generated grid to be non-placeable and restart the process with that grid
                if by the end we have tried to change every cell to non-placeable and still have multiple solutions, we restart the entire grid generation process
            */
            
            let lastNonForcedCellIndex = -1;
            let triedPatternsPerCell: Record<number, Set<number>> = {};

            for (let i = 0; i < solverGrid.length; i++) {
                const cell = solverGrid[i];
                if (cell.completedValue === "X" || cell.completedValue === "-" || cell.completedValue === "O") continue;
                // Vision placement logic here
                let placementResult = tryPlaceVisionsForCell(cell);
                if (placementResult !== "failure") {
                    if (placementResult !== "forced") {
                        // This cell's vision placement wasn't forced
                        lastNonForcedCellIndex = i;
                    }
                    // Successfully placed vision cells for this cell
                    
                    if (gridFull()) {
                        // Found a solution
                        // check if solution matches original grid
                        for (let j = 0; j < solverGrid.length; j++) {
                            if (solverGrid[j].value !== solverGrid[j].completedValue) {
                                solverGrid[j].value = solverGrid[j].completedValue;
                                solverGrid[j].neededForCompletion = true;
                                for (let k = 0; k < solverGrid.length; k++) {
                                    if (!solverGrid[k].neededForCompletion) {
                                        // If we have a cell that is not needed for completion, we can try again with this new grid
                                        return ensureUniqueSolution(solverGrid);
                                    }
                                }
                                // If we reach here, we have tried to change every cell to non-placeable and still have multiple solutions
                                // We need to restart the entire grid generation process
                                return null;
                            }
                        }
                        break;
                    }

                } else {
                    // Failed to place visions for this cell, need to backtrack

                }
            }

            // If we reach here, we should have a unique solution
            return solverGrid;
        }

        /*
        let uniqueGrid = ensureUniqueSolution(grid);
        if (!uniqueGrid) {
            console.warn("Failed to ensure unique solution, regenerating grid...");
            return generateGrid(grid.map(cell => ({
                index: cell.index,
                x: cell.x,
                y: cell.y,
                value: "-",
                completedValue: "-",
                patterns: {},
                neededForCompletion: false,
                placeable: true,
            })));
        }
        */
        return grid;
    }

    const [savedBestTime, setSavedBestTime] = useState<number>(0);

    useEffect(() => {
        const stored = localStorage.getItem(`singleplayer-best-${size}`);
        const best = stored && !isNaN(Number(stored)) ? Number(stored) : 0;
        setSavedBestTime(best);
    }, [size]);



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

    const [elapsed, setElapsed] = useState(0);
    const timerStartedRef = useRef(false);
    const lastTimestampRef = useRef<number | null>(null);

    function startTimer() { // timer based on delta time from request animation frame
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

    const cellColors = ["--color-zinc-800", "--color-cyan-700", "--color-orange-700"];
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
                        className={`h-[2.2em] aspect-square font-bold text-gray-300 rounded-[30%] flex items-center justify-center cursor-pointer select-none focus:outline-none`}
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
    );
}