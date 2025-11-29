import { Server } from "socket.io";

export default function SocketHandler(request: any, response: any) {
    if (response.socket.server.io) {
        response.end();
        return;
    }

    const io = new Server(response.socket.server);
    response.socket.server.io = io;

    type newEloCalculation = { totalDifference: number; baseChange: number; size: number; randomFactor: number; newPlayerMultiplier: boolean; newElo: number; };

    type User = {
        id: string;
        size: number | "any";
        elo: number;
        gamesPlayed: number;
        newEloCalculation?: newEloCalculation;
        finishedTime?: number;
        completed: boolean;
        gameId?: string;
    }

    let queue: User[] = [];

    type Game = {
        id: string;
        players: User[];
        size: number;
        grid: any;
        state: "ongoing" | "completed";
    }

    let games: { [id: string]: Game } = {};

    function calculateEloGainLoss(player: User, opponent: User, size: number): [newEloCalculation, newEloCalculation] {
        const playerElo = player.elo;
        const opponentElo = opponent.elo;

        const randomFactor = Math.floor(Math.random() * 6) + 1;

        let winEloChange:newEloCalculation = {
            totalDifference: 0,
            baseChange: 0,
            size: 1 + 0.1*(size-4),
            randomFactor: randomFactor,
            newPlayerMultiplier: player.gamesPlayed <= 5,
            newElo: 0
        };

        let lossEloChange:newEloCalculation = {
            totalDifference: 0,
            baseChange: 0,
            size: 1 - 0.05*(size-4),
            randomFactor: -randomFactor,
            newPlayerMultiplier: player.gamesPlayed <= 5,
            newElo: 0
        };

        const kFactor = 32;
        const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
        winEloChange.baseChange = Math.round(kFactor * (1 - expectedScore));
        lossEloChange.baseChange = Math.round(kFactor * (0 - expectedScore));

        winEloChange.newElo = playerElo + Math.floor((winEloChange.baseChange + winEloChange.randomFactor) * winEloChange.size  * (winEloChange.newPlayerMultiplier ? 2 : 1));
        lossEloChange.newElo = playerElo - Math.floor((lossEloChange.baseChange  + lossEloChange.randomFactor) * lossEloChange.size * (lossEloChange.newPlayerMultiplier ? 0.5 : 1));

        winEloChange.totalDifference = winEloChange.newElo - playerElo;
        lossEloChange.totalDifference = playerElo - lossEloChange.newElo;

        return [winEloChange, lossEloChange];
    }

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
        correctPatternIndex: number | null;
        neededForCompletion: boolean;
        placeable: boolean;
    }

    type SimpleCell = {
        index: number;
        x: number;
        y: number;
        value: number | "X" | "O" | "-";
        completedValue: number | "X" | "O" | "-";
        neededForCompletion: boolean;
    }

    function generatePossiblePatternsForCell(cell: Cell, grid: Cell[], size: number) {
        //console.log("REPLACEDTOXINDEX", grid[replacedToXIndex]);
        function getCell(x: number, y: number): Cell | null {
            if (x < 0 || x >= size || y < 0 || y >= size) return null;
            return grid[y * size + x];
        }
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

    let replacedToXIndex = 0;

    function generateGrid(grid: Cell[], size:number): Cell[] {
        function getCell(x: number, y: number, grid: Cell[]): Cell | null {
            if (x < 0 || x >= size || y < 0 || y >= size) return null;
            return grid[y * size + x];
        }
        function getCellByIndex(index: number, grid: Cell[]): Cell | null {
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
            cell.correctPatternIndex = Math.floor(Math.random() * patternsForCell.length);
            const randomPattern = patternsForCell[cell.correctPatternIndex];
            for (const patternCell of randomPattern) {
                const targetCell = getCellByIndex(patternCell.index!, grid);
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
            generatePossiblePatternsForCell(randomCell, grid, size);
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
        /*
        function ensureUniqueSolution(grid: Cell[]): Cell[] | null {

            type DecisionPoint = {
                numberCellIndex: number;
                patternIndex: number;
                patterns: Pattern[];
            }

            let stack: DecisionPoint[] = [];

            console.log("Ensuring unique solution for the generated grid...", grid);

            let solverGrid:Cell[] = grid.map(cell => ({ ...cell }));
            // Set the completedValue of all non-needed cells to "-"
            for (let cell of solverGrid) {
                if (!cell.neededForCompletion) {
                    cell.completedValue = "-";
                    if (cell.index === replacedToXIndex && replacedToXIndex !== 0) {
                        console.error("Reset replacedToXIndex cell to '-' at ", cell.x, cell.y);
                    }
                }
            }

            console.log(JSON.stringify(solverGrid[replacedToXIndex]));

            let numberCells:Cell[] = solverGrid.filter(cell => typeof(cell.completedValue) === "number");

            let correctPatterns = numberCells.map(cell => {
                return cell.patterns[cell.completedValue as number][cell.correctPatternIndex as number] || [];
            });

            let currentIndex = 0;

            function generateValidPatternsForCell(cell: Cell): Pattern[] {
                const currentNumberCellIndex = numberCells.indexOf(cell);
                generatePossiblePatternsForCell(cell, solverGrid);
                let patterns = cell.patterns[cell.completedValue as number] || [];
                const correctPattern = correctPatterns[currentNumberCellIndex];
                
                // Check if correct pattern is among patterns
                if (patterns.some(pat => JSON.stringify(pat) === JSON.stringify(correctPattern))) {
                    // remove the correct pattern from patterns and replace it back at the end
                    const filteredPatterns = patterns.filter(pat => JSON.stringify(pat) !== JSON.stringify(correctPattern));
                    patterns = [...filteredPatterns, correctPattern];
                }
                console.log("Valid patterns for cell at " + `(${cell.x}, ${cell.y})` + " :", patterns);
                return patterns
            }

            function undoPatternPlacement(pattern: Pattern) {
                for (const patternCell of pattern) {
                    const targetCell = getCellByIndex(patternCell.index!, solverGrid);
                    if (!targetCell) {
                        console.error("Target cell not found in pattern undo at ", patternCell.x, patternCell.y);
                        continue;
                    };
                    console.log("Reverting cell at " + `(${targetCell.x}, ${targetCell.y})` + " from " + targetCell.completedValue + " to " + patternCell.completedValue);
                    targetCell.completedValue = patternCell.completedValue; // Revert to previous completedValue
                }
            }

            function applyPattern(pattern: Pattern) {
                console.log("Applying pattern:", pattern);
                for (const patternCell of pattern) {
                    const targetCell = getCellByIndex(patternCell.index!, solverGrid);
                    if (!targetCell) {
                        console.error("Target cell not found in pattern application at ", patternCell.x, patternCell.y);
                        continue;
                    };
                    console.log("Applying cell at " + `(${targetCell.x}, ${targetCell.y})` + " to " + patternCell.desiredValue);
                    if (targetCell.index === replacedToXIndex && replacedToXIndex !== 0) {
                        console.error("Set replacedToXIndex cell to 'O' at ", targetCell.x, targetCell.y);
                        return null;
                    }
                    targetCell.completedValue = patternCell.desiredValue; // Apply desiredValue
                }
            }

            function fillEmptyCellsWithBlockers() {
                for (let cell of solverGrid) {
                    if (cell.completedValue === "-") {
                        cell.completedValue = "X";
                    }
                }
                console.log("Filled empty cells with blockers.");
            }

            function checkGridCorrect(): boolean {
                for (let i = 0; i < solverGrid.length; i++) {
                    if (solverGrid[i].completedValue !== grid[i].completedValue) {
                        console.log(`Mismatch at ${solverGrid[i].x},${solverGrid[i].y}: solver=${solverGrid[i].completedValue}, original=${grid[i].completedValue}`);
                        return false;
                    }
                }
                return true;
            }

            function blockFirstDeviationAndRetry(): Cell[] | null {

                const newGrid = solverGrid.map(cell => ({ ...cell }));

                for (let i = 0; i < solverGrid.length; i++) {
                    console.log(`Comparing cell at ${solverGrid[i].x},${solverGrid[i].y}: solver=${solverGrid[i].completedValue}, original=${grid[i].completedValue}`);
                    if (solverGrid[i].completedValue !== grid[i].completedValue && grid[i].completedValue === "X" && solverGrid[i].completedValue == "O") {
                        newGrid[i].completedValue = "X";
                        newGrid[i].value = "X";
                        newGrid[i].neededForCompletion = true;
                        newGrid[i].placeable = false;
                        replacedToXIndex = i;
                        console.log("Blocked cell at " + `(${solverGrid[i].x}, ${solverGrid[i].y})` + " and retrying.");
                        break;
                    }
                }
                return ensureUniqueSolution(newGrid);
                //return null;
            }

            while (true) {
                if (currentIndex >= numberCells.length) {
                    fillEmptyCellsWithBlockers();
                    if (checkGridCorrect()) {
                        console.log("Unique solution ensured.");
                        return solverGrid;
                    } else {
                        console.warn("Multiple solutions found, backtracking...");
                        return blockFirstDeviationAndRetry();
                    }
                } else {
                    const currentCell = numberCells[currentIndex];
                    const validPatterns = generateValidPatternsForCell(currentCell);

                    if (validPatterns.length === 0) {
                        console.log("No valid patterns available, backtracking...");
                        if (stack.length === 0) {
                            console.error("No more decision points to backtrack to, failed to ensure unique solution.");
                            return null;
                        }
                        const lastDecision = stack.pop()!;
                        undoPatternPlacement(lastDecision.patterns[lastDecision.patternIndex]);

                        lastDecision.patternIndex++;

                        if (lastDecision.patternIndex < lastDecision.patterns.length) {
                            applyPattern(lastDecision.patterns[lastDecision.patternIndex]);
                            stack.push(lastDecision);
                            console.log("Backtracked to previous decision point at cell index ", lastDecision.numberCellIndex, " and trying next pattern.");
                            currentIndex = lastDecision.numberCellIndex;
                        } else {
                            console.log("All patterns exhausted at cell index ", lastDecision.numberCellIndex, ", backtracking further.");
                            currentIndex = lastDecision.numberCellIndex;
                        }
                        continue;
                    }
                    
                    const pattern = validPatterns[0];
                    applyPattern(pattern);

                    stack.push({ numberCellIndex: currentIndex, patternIndex: 0, patterns: validPatterns });

                    currentIndex++;
                }
            }
        }
        */
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
                correctPatternIndex: null,
                neededForCompletion: false,
                placeable: true,
            })));
        }
        
        return uniqueGrid;*/

        return grid;
    }

    io.on("connection", (socket) => {
        console.log("New client connected:", socket.id);

        socket.on("joinQueue", (data) => {
            console.log(`Client ${socket.id} joined queue for size ${data.size}`);
            const newUser: User = {
                id: socket.id,
                size: data.size,
                elo: data.elo,
                gamesPlayed: data.gamesPlayed,
                completed: false
            };
            queue.push(newUser);
            // Look for a match
            for (let i = 0; i < queue.length; i++) {
                const potentialMatch = queue[i];
                if (potentialMatch.id !== newUser.id && (newUser.size === "any" || potentialMatch.size === "any" || newUser.size === potentialMatch.size)) {
                    // Match found
                    const matchedUser = potentialMatch;

                    queue = queue.filter(user => user.id !== newUser.id && user.id !== matchedUser.id);

                    console.log(`Match found between ${newUser.id} and ${matchedUser.id}`);
                    let gameSize: number;
                    if (newUser.size === "any" && matchedUser.size === "any") {
                        gameSize = Math.floor(Math.random() * 6) + 4;
                    } else if (newUser.size === "any") {
                        gameSize = matchedUser.size as number;
                    } else if (matchedUser.size === "any") {
                        gameSize = newUser.size as number;
                    } else {
                        gameSize = newUser.size as number;
                    }

                    console.log(`Starting game of size ${gameSize} between ${newUser.id} and ${matchedUser.id}`);

                    const [newUserWinEloChange, newUserLossEloChange] = calculateEloGainLoss(newUser, matchedUser, gameSize);
                    const [matchedUserWinEloChange, matchedUserLossEloChange] = calculateEloGainLoss(matchedUser, newUser, gameSize);

                    console.log("Elo calculations:", {
                        newUserWinEloChange,
                        newUserLossEloChange,
                        matchedUserWinEloChange,
                        matchedUserLossEloChange
                    });

                    // Generate a grid here
                    const newGrid: Cell[] = Array.from({ length: gameSize * gameSize }, (_, i) => ({
                        index: i,
                        x: i % gameSize,
                        y: Math.floor(i / gameSize),
                        value: "-",
                        completedValue: "-",
                        patterns: {},
                        correctPatternIndex: null,
                        neededForCompletion: false,
                        placeable: true,
                    }));

                    const grid:Cell[] = generateGrid(newGrid, gameSize);
                    const simplifiedGrid:SimpleCell[] = grid.map(cell => ({ index: cell.index, x: cell.x, y: cell.y, value: cell.value, completedValue: cell.completedValue, neededForCompletion: cell.neededForCompletion }));

                    // Store game state
                    const gameId = `${newUser.id}-${matchedUser.id}-${Date.now()}`;
                    const newGame: Game = {
                        id: gameId,
                        players: [newUser, matchedUser],
                        size: gameSize,
                        grid: grid,
                        state: "ongoing"
                    };

                    games[gameId] = newGame;

                    newUser.gameId = gameId;
                    matchedUser.gameId = gameId;

                    io.to(newUser.id).emit("playGame", {
                        size: gameSize,
                        grid: simplifiedGrid,
                        tempElo: newUserLossEloChange.newElo, // both start as losers for if they quit early
                        newGamesPlayed: newUser.gamesPlayed + 1
                    });

                    console.log("Emitted playGame to ", newUser.id, " with grid");

                    io.to(matchedUser.id).emit("playGame", {
                        size: gameSize,
                        grid: simplifiedGrid,
                        tempElo: matchedUserLossEloChange.newElo, // both start as losers for if they quit early
                        newGamesPlayed: matchedUser.gamesPlayed + 1
                    });

                    console.log("Emitted playGame to ", matchedUser.id, " with grid");

                    socket.on("timerStopped", (data) => {
                        const elapsedTime = data.elapsed;
                        const gridState = data.gridData;

                        let user = socket.id === newUser.id ? newUser : matchedUser;
                        let otherUser = socket.id === newUser.id ? matchedUser : newUser;

                        user.finishedTime = elapsedTime;
                        user.completed = data.completed;

                        // Once grids are unique solution only
                        /* if (user.completed) {
                            // Check grid vs server grid solution here to verify completion
                            for (let cellData of gridState) {
                                const serverCell = grid[cellData.index];
                                if (cellData.value !== serverCell.completedValue) {
                                    user.completed = false;
                                    break;
                                }
                            }
                        } */

                        console.log(`Client ${socket.id} stopped timer at ${elapsedTime}ms, completed: ${user.completed}`);

                        if (typeof otherUser.finishedTime === "number") {
                            if (user.completed && otherUser.completed) {
                                games[gameId].state = "completed";
                                console.log(`Both players completed the game. Determining winner between ${user.id} and ${otherUser.id}.`);
                                delete games[gameId];
                                // Both completed, determine winner
                                if (user.finishedTime! <= otherUser.finishedTime!) {
                                    // User wins

                                    io.to(user.id).emit("gameFinished", { won: true, newElo: newUserWinEloChange.newElo, newEloCalculation: newUserWinEloChange, otherForfeit: false });
                                    io.to(otherUser.id).emit("gameFinished", { won: false, newElo: matchedUserLossEloChange.newElo, newEloCalculation: matchedUserLossEloChange, otherForfeit: false });
                                } else if (user.finishedTime! > otherUser.finishedTime!) {
                                    // Other user wins

                                    io.to(user.id).emit("gameFinished", { won: false, newElo: newUserLossEloChange.newElo, newEloCalculation: newUserLossEloChange, otherForfeit: false });
                                    io.to(otherUser.id).emit("gameFinished", { won: true, newElo: matchedUserWinEloChange.newElo, newEloCalculation: matchedUserWinEloChange, otherForfeit: false });
                                } 
                            } else if (user.completed && !otherUser.completed) {
                                // User wins by completion

                                io.to(user.id).emit("gameFinished", { won: true, newElo: newUserWinEloChange.newElo, newEloCalculation: newUserWinEloChange, otherForfeit: false });
                                io.to(otherUser.id).emit("gameFinished", { won: false, newElo: matchedUserLossEloChange.newElo, newEloCalculation: matchedUserLossEloChange, otherForfeit: false });
                            } else if (!user.completed && otherUser.completed) {
                                // Other user wins by completion

                                io.to(user.id).emit("gameFinished", { won: false, newElo: newUserLossEloChange.newElo, newEloCalculation: newUserLossEloChange, otherForfeit: false });
                                io.to(otherUser.id).emit("gameFinished", { won: true, newElo: matchedUserWinEloChange.newElo, newEloCalculation: matchedUserWinEloChange, otherForfeit: false });
                            } else {
                                // Both failed to complete, no elo change

                                io.to(user.id).emit("gameFinished", { won: false, newElo: user.elo, newEloCalculation: null, otherForfeit: false });
                                io.to(otherUser.id).emit("gameFinished", { won: false, newElo: otherUser.elo, newEloCalculation: null, otherForfeit: false });
                            }

                        } else {
                            io.to(otherUser.id).emit("otherPlayerFinished", { finishedTime: elapsedTime });
                            setTimeout(() => {
                                if (typeof otherUser.finishedTime !== "number") {
                                    if (user.completed) {
                                        io.to(user.id).emit("gameFinished", { won: true, newElo: newUserWinEloChange.newElo, newEloCalculation: newUserWinEloChange, otherForfeit: false });
                                        io.to(otherUser.id).emit("gameFinished", { won: false, newElo: matchedUserLossEloChange.newElo, newEloCalculation: matchedUserLossEloChange, otherForfeit: false });
                                        games[gameId].state = "completed";
                                        console.log(`Notified ${user.id} of win as other player did not finish in time.`);
                                        delete games[gameId];
                                    }
                                }
                            }, 3000);
                        }

                    });
                }
            }
            io.to(socket.id).emit("queueJoined");
        });

        socket.on("disconnect", () => {
            console.log("Client disconnected:", socket.id);
            queue = queue.filter(user => user.id !== socket.id);

            for (const gameId in games) {
                const game = games[gameId];
                if (game.players.some(player => player.id === socket.id) && game.state === "ongoing") {
                    game.state = "completed";
                    const otherPlayer = game.players.find(player => player.id !== socket.id)!;
                    const [otherPlayerWinEloChange, otherPlayerLossEloChange] = calculateEloGainLoss(otherPlayer, game.players.find(player => player.id === socket.id)!, game.size);
                    io.to(otherPlayer.id).emit("gameFinished", { won: true, newElo: otherPlayerWinEloChange.newElo, newEloCalculation: otherPlayerWinEloChange, otherForfeit: true });
                    console.log(`Notified ${otherPlayer.id} of win due to opponent disconnect.`);
                    delete games[gameId];
                }
            }
        });

    });

    response.end();
}