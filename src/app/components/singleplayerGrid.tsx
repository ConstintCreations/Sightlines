"use client";
import { motion, useAnimation, Variants } from "framer-motion";
import { get } from "http";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

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

    

    const [grid, setGrid] = useState<string[]>([]);
    useEffect(() => {
        setGrid(Array(size*size).fill("-"));
    }, [size]);

    const [completeGrid, setCompleteGrid] = useState<string[]>([]);
    useEffect(() => {
        setRandomCompleteGrid();
    }, [size]);

    function setRandomCompleteGrid(count?: number, completedGrid?: string[], placeableGrid?: (Array<number> | null)[]) {
        if (!placeableGrid) placeableGrid = Array.from({ length: size * size }, () => Array.from({ length: size + 1 }, (_, i) => i));
        if (!completedGrid) completedGrid = Array(size*size).fill("-");

        const randomCellIndex = getRandomPlaceableCell(placeableGrid);
        for (let i = 0; i < size*size; i++) {
            if (completedGrid[i] === "-") break;
            if (i === size*size - 1) {
                setCompleteGrid(completedGrid);
                return;
            }
        }

        let onlyZeroCellsLeft = true;
        for (let i = 0; i < placeableGrid.length; i++) {
            if (placeableGrid[i] !== null && !(placeableGrid[i]!.length === 1 && placeableGrid[i]![0] === 0)) {
                onlyZeroCellsLeft = false;
                break;
            }
        }
        if (onlyZeroCellsLeft) {
            for (let i = 0; i < size*size; i++) {
                if (completedGrid[i] === "-") {
                    completedGrid[i] = "0";
                }
            }
            setCompleteGrid(completedGrid);
            return;
        }

        if (randomCellIndex === null || placeableGrid[randomCellIndex] === null) {
            setCompleteGrid(completedGrid);
            return;
        } else {
            const randomCell = placeableGrid[randomCellIndex];
            const randomValue = randomCell[Math.floor(Math.random() * randomCell.length)];
            completedGrid[randomCellIndex] = randomValue.toString();
            placeableGrid[randomCellIndex] = null;
            if (randomValue !== 0) {
                const cellCount = randomValue - Math.min(...(placeableGrid[randomCellIndex] == null ? [0] : placeableGrid[randomCellIndex]!));
                const returnedCellSolution = setRandomCellSolution(randomCellIndex, cellCount, completedGrid, placeableGrid);
                completedGrid = returnedCellSolution.completedGrid;
                placeableGrid = returnedCellSolution.placeableGrid;
            }
            
            if (count) {
                count--;
                if (count <= 0) {
                    setCompleteGrid(completedGrid);
                    return;
                }
            }
            setRandomCompleteGrid(count ? count : undefined, completedGrid, placeableGrid);
        }
    }

    type placeableDirectionType = {
        up: boolean,
        down: boolean,
        left: boolean,
        right: boolean
    }

    function setRandomCellSolution(cellIndex: number, cellCount: number, completedGrid: string[], placeableGrid: (Array<number> | null)[], placedIndexes?: number[]) {
        if (!placedIndexes) placedIndexes = [cellIndex];
        placedIndexes = getPlaceableCellInRandomDirection(cellIndex, cellCount, placedIndexes, placeableGrid);

        let leftMost = cellIndex;
        let rightMost = cellIndex;
        let topMost = cellIndex;
        let bottomMost = cellIndex;
        let horizontalVision = 1;
        let verticalVision = 1;

        const cellIndexRow = Math.floor(cellIndex/size);
        const cellIndexCol = cellIndex%size;

        for (let i = 1; i < placedIndexes.length; i++) {
            const index = placedIndexes[i];
            completedGrid[index] = "O";
            
            const placedIndexRow = Math.floor(placedIndexes[i]/size);
            const placedIndexCol = placedIndexes[i]%size;

            if (placedIndexes[i] < leftMost && placedIndexCol < cellIndexCol) leftMost = placedIndexes[i];
            if (placedIndexes[i] > rightMost && placedIndexCol > cellIndexCol) rightMost = placedIndexes[i];
            if (placedIndexes[i] < topMost && placedIndexRow < cellIndexRow) topMost = placedIndexes[i];
            if (placedIndexes[i] > bottomMost && placedIndexRow > cellIndexRow) bottomMost = placedIndexes[i];

            horizontalVision = Math.max(horizontalVision, Math.abs((placedIndexes[i]%size) - (cellIndex%size)));
            verticalVision = Math.max(verticalVision, Math.abs(Math.floor(placedIndexes[i]/size) - Math.floor(cellIndex/size)));
        }

        const topIndex = getNextIndexInDirection(topMost, "up")!;
        const bottomIndex = getNextIndexInDirection(bottomMost, "down")!;
        const leftIndex = getNextIndexInDirection(leftMost, "left")!;
        const rightIndex = getNextIndexInDirection(rightMost, "right")!;

        if (topIndex >= 0 && placeableGrid[topIndex] !== null) {
            completedGrid[topIndex] = "0";
            placeableGrid[topIndex] = null;
        }
        if (bottomIndex < size*size && placeableGrid[bottomIndex] !== null) {
            completedGrid[bottomIndex] = "0";
            placeableGrid[bottomIndex] = null;
        }
        if (leftIndex % size >= 0 && (placeableGrid[leftIndex] !== null) && (cellIndexRow == Math.floor(leftIndex/size))) {
            completedGrid[leftIndex] = "0";
            placeableGrid[leftIndex] = null;
        }
        if (rightIndex % size < size && (placeableGrid[rightIndex] !== null) && (cellIndexRow == Math.floor(rightIndex/size))) {
            completedGrid[rightIndex] = "0";
            placeableGrid[rightIndex] = null;
        }

        placeableGrid = updatePlaceableGrid(completedGrid, placeableGrid)!;

        logGrid(completedGrid, placeableGrid);

        return {completedGrid, placeableGrid};
    }

    function getPlaceableCellInRandomDirection(cellIndex: number, count: number, placedIndexes: number[], placeableGrid: (Array<number> | null)[]) {
        
        let placeableDirections = getPlaceableDirections(cellIndex, placedIndexes, placeableGrid);
                
        const availableDirections = Object.keys(placeableDirections).filter(dir => placeableDirections[dir as keyof placeableDirectionType]);
        if (availableDirections.length === 0) {
            console.error("No available directions");
            return placedIndexes;
        }
        let direction = availableDirections[Math.floor(Math.random() * availableDirections.length)];
        
        let newCellIndex;

        let leftMost = cellIndex;
        let rightMost = cellIndex;
        let topMost = cellIndex;
        let bottomMost = cellIndex;
        for (let i=0; i < placedIndexes.length; i++) {

            const cellIndexRow = Math.floor(cellIndex/size);
            const cellIndexCol = cellIndex%size;

            const placedIndexRow = Math.floor(placedIndexes[i]/size);
            const placedIndexCol = placedIndexes[i]%size;

            if (placedIndexes[i] < leftMost && placedIndexCol < cellIndexCol) leftMost = placedIndexes[i];
            if (placedIndexes[i] > rightMost && placedIndexCol > cellIndexCol) rightMost = placedIndexes[i];
            if (placedIndexes[i] < topMost && placedIndexRow < cellIndexRow) topMost = placedIndexes[i];
            if (placedIndexes[i] > bottomMost && placedIndexRow > cellIndexRow) bottomMost = placedIndexes[i];
            
        }

        switch (direction) {
            case "up":
                newCellIndex = getNextIndexInDirection(topMost, "up")!;
                placedIndexes.push(newCellIndex);
                break;
            case "down":
                newCellIndex = getNextIndexInDirection(bottomMost, "down")!;
                placedIndexes.push(newCellIndex);
                break;
            case "left":
                newCellIndex = getNextIndexInDirection(leftMost, "left")!;
                placedIndexes.push(newCellIndex);
                break;
            case "right":
                newCellIndex = getNextIndexInDirection(rightMost, "right")!;
                placedIndexes.push(newCellIndex);
                break;
        }
        
        if (availableDirections.length == 0 || count-1 <= 0) {
            return placedIndexes;
        } else {
            count--;
            return getPlaceableCellInRandomDirection(cellIndex, count, placedIndexes, placeableGrid);
        }
    }

    function getPlaceableDirections(cellIndex: number, placedIndexes: number[], placeableGrid: (Array<number> | null)[]) {
        let placeableDirections: placeableDirectionType = { up:true, down: true, left: true, right: true};

        const center = cellIndex;
        let leftMost = placedIndexes[0];
        let rightMost = placedIndexes[0];
        let topMost = placedIndexes[0];
        let bottomMost = placedIndexes[0];

        let horizontalVision = 1;
        let verticalVision = 1;

        for (let i=0; i < placedIndexes.length; i++) {
            if (placeableDirections.left && placedIndexes[i]%size==0) {
                placeableDirections.left = false;
            }
            if (placeableDirections.right && placedIndexes[i]%size==size-1) {
                placeableDirections.right = false;
            }
            if (placeableDirections.up && placedIndexes[i] < size) {
                placeableDirections.up = false;
            }
            if (placeableDirections.down && placedIndexes[i] >= size*size - size) {
                placeableDirections.down = false;
            }

            if (placedIndexes[i] < leftMost) leftMost = placedIndexes[i];
            if (placedIndexes[i] > rightMost) rightMost = placedIndexes[i];
            if (placedIndexes[i] < topMost) topMost = placedIndexes[i];
            if (placedIndexes[i] > bottomMost) bottomMost = placedIndexes[i];

            horizontalVision = Math.max(horizontalVision, Math.abs((placedIndexes[i]%size) - (center%size)));
            verticalVision = Math.max(verticalVision, Math.abs(Math.floor(placedIndexes[i]/size) - Math.floor(center/size)));
        }

        if (placeableDirections.left) {
            const nextIndex = getNextIndexInDirection(leftMost, "left");
            if ((nextIndex && placeableGrid[nextIndex] === null) || (nextIndex && placeableGrid[nextIndex] && Math.max(...placeableGrid[nextIndex]!) < horizontalVision+1)) placeableDirections.left = false;
        }
        if (placeableDirections.right) {
            const nextIndex = getNextIndexInDirection(rightMost, "right");
            if ((nextIndex && placeableGrid[nextIndex] === null) || (nextIndex && placeableGrid[nextIndex] && Math.max(...placeableGrid[nextIndex]!) < horizontalVision+1)) placeableDirections.right = false;
        }
        if (placeableDirections.up) {
            const nextIndex = getNextIndexInDirection(topMost, "up");
            if ((nextIndex && placeableGrid[nextIndex] === null) || (nextIndex && placeableGrid[nextIndex] && Math.max(...placeableGrid[nextIndex]!) < verticalVision+1)) placeableDirections.up = false;
        }
        if (placeableDirections.down) {
            const nextIndex = getNextIndexInDirection(bottomMost, "down");
            if ((nextIndex && placeableGrid[nextIndex] === null) || (nextIndex && placeableGrid[nextIndex] && Math.max(...placeableGrid[nextIndex]!) < verticalVision+1)) placeableDirections.down = false;
        }

        return placeableDirections;
    }

    function getNextIndexInDirection(currentIndex: number, direction: string) {
        switch (direction) {
            case "up":
                return currentIndex - size;
            case "down":
                return currentIndex + size;
            case "left":
                return currentIndex - 1;
            case "right":
                return currentIndex + 1;
        }
    }

    function getRandomPlaceableCell(placeableGrid?: (Array<number> | null)[]) {
        if (!placeableGrid) return null;
        const placeableCells = placeableGrid.map((val, index) => val ? index : -1).filter(index => index != -1);
        if (placeableCells.length == 0) return null;
        const randomIndex = placeableCells[Math.floor(Math.random() * placeableCells.length)];
        return randomIndex;
    }

    function updatePlaceableGrid(completedGrid: string[], placeableGrid: (Array<number> | null)[]) {
        
        for (let i = 0; i < size*size; i++) {
            if (placeableGrid[i] === null) continue;

            if (completedGrid[i] !== "-" && completedGrid[i] !== "O") {
                placeableGrid[i] = null;
                continue;
            }

            let minVision = 0;
            let maxVision = 0;

            const directions: ("up" | "down" | "left" | "right")[] = ["up", "down", "left", "right"];
            for (let dirIndex = 0; dirIndex < directions.length; dirIndex++) {
                const direction = directions[dirIndex];
                let nextIndex = getNextIndexInDirection(i, direction);
                while (nextIndex !== undefined && nextIndex >= 0 && nextIndex < size*size) {
                    if (completedGrid[nextIndex] == "0") {
                        break;
                    } else if (completedGrid[nextIndex] == "-") {
                        maxVision++;
                    } else {
                        minVision++;
                        maxVision++;
                    }
                    if (minVision >= size) {
                        placeableGrid[i] = null;
                        break;
                    }
                    nextIndex = getNextIndexInDirection(nextIndex, direction);
                }
            }

            let newPlaceableValues: number[] = [];
            for (let i = minVision; i <= (maxVision > size ? size : maxVision); i++) {
                newPlaceableValues.push(i);
            }
            if (newPlaceableValues.length === 0) {
                placeableGrid[i] = null;
                continue;
            }
            placeableGrid[i] = newPlaceableValues;
            continue;
        }

        return placeableGrid;
    }

    function logGrid(completedGrid: string[], placeableGrid: (Array<number> | null)[]) {
        for (let i = 0; i < size; i++) {
            console.log(JSON.stringify(completedGrid).slice(i*size*4, i*size*4 + size*4));
        }
        console.log("-".repeat(size*4));
        for (let i = 0; i < size; i++) {
            let line = "";
            for (let j = 0; j < size; j++) {
                line += JSON.stringify(placeableGrid[j+size*i]);
                line += " ";
            }
            console.log(line);
        }

        console.log(" ".repeat(size*4));
        console.log("=".repeat(size*4));
        console.log(" ".repeat(size*4));
    }

    const cellColors = ["--color-zinc-800", "--color-cyan-700", "--color-orange-700"];
    const [colorIndex, setColorIndex] = useState<number[]>([]);
    useEffect(() => {
        setColorIndex(Array.from({ length: size * size }).map((_, index) => parseInt(completeGrid[index]) > 0 || completeGrid[index] == "O" ? 1 : parseInt(completeGrid[index]) === 0 ? 2 : 0 ));
    }, [completeGrid]);

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
                    {Number(completeGrid[index]) > 0 ? completeGrid[index] : ""}
                </motion.div>
            ))}
        </div>
    );
}