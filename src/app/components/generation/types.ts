//#region Helpers

import { SolveGrid } from "./solver";

export interface Position {
    x: number;
    y: number;
}

export enum Direction {
    Up = "Up",
    Down = "Down",
    Left = "Left",
    Right = "Right"
}

export const AllDirections: Direction[] = [
    Direction.Up,
    Direction.Down,
    Direction.Left,
    Direction.Right,
]

export const DirectionVector: Record<Direction, Position> = {
    [Direction.Up]: { x: 0, y: -1 },
    [Direction.Down]: { x: 0, y: 1 },
    [Direction.Left]: { x: -1, y: 0 },
    [Direction.Right]: { x: 1, y: 0 }
}

export function shuffleArray(array: any[]): any[] {
    for (let index = 0; index < array.length - 1; index++) {
        let shuffledIndex = index + Math.floor(Math.random() * (array.length - index));
        let temporaryValue = array[shuffledIndex];
        array[shuffledIndex] = array[index];
        array[index] = temporaryValue;
    }

    return array;
}

//#endregion

//#region CellAnalysis
    export interface DirectionalCellInfo {
        noneCellCount: number;
        numberCountAfterNoneCellFound: number;
        wouldConvertingNoneCellOverflow: boolean;
        maximumPossibleValue: number;
        maximumPossibleCountInOtherDirections: number;
        valueWhenConvertingFirstNoneCellToVision: number;
    }

    export interface CellInfo {
        noneCellsAround: number;
        confirmedVisibleCells: number;
        isValueReached: boolean;
        canBeReachedWithNoneCells: boolean;
        valueReachedCellsAround: boolean; // Second Pass
        onlyOnePossibleDirection: Direction | null;
        directions: {
            [Direction.Up]: DirectionalCellInfo,
            [Direction.Down]: DirectionalCellInfo,
            [Direction.Left]: DirectionalCellInfo,
            [Direction.Right]: DirectionalCellInfo,
        }
    }

    export function CreateDirectionalCellInfo(): DirectionalCellInfo {
        return {
            noneCellCount: 0,
            numberCountAfterNoneCellFound: 0,
            wouldConvertingNoneCellOverflow: false,
            maximumPossibleValue: 0,
            maximumPossibleCountInOtherDirections: 0,
            valueWhenConvertingFirstNoneCellToVision: 0
        }
    }

    export function CreateCellInfo(): CellInfo {
        return {
            noneCellsAround: 0,
            confirmedVisibleCells: 0,
            isValueReached: false,
            canBeReachedWithNoneCells: false,
            valueReachedCellsAround: false, // Second Pass
            onlyOnePossibleDirection: null,
            directions: {
                [Direction.Up]: CreateDirectionalCellInfo(),
                [Direction.Down]: CreateDirectionalCellInfo(),
                [Direction.Left]: CreateDirectionalCellInfo(),
                [Direction.Right]: CreateDirectionalCellInfo(),
            }
        }
    } 
//#endregion

//#region Cell

export enum CellType {
    None = "None",
    Vision = "Vision",
    Blocker = "Blocker",
    Value = "Value"
}

export class Cell {
    public info: CellInfo | null = null;

    constructor(
        public x: number,
        public y: number,
        public type: CellType = CellType.None,
        public value: number | null = null
    ) {}
}

//#endregion

//#region Grid

export class Grid {
    size: number;
    cells: Cell[];
    savedGrids: Record<number, {grid: Grid}> = {};
    solved: Grid | null = null;

    constructor(size: number) {
        this.size = size;

        this.cells = []

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                this.cells.push(new Cell(x, y));
            }
        }
    }

    getIndex(x: number, y:number): number {
        return y * this.size + x;
    }

    getCell(x: number, y: number): Cell | null {
        if (x < 0 || y < 0 || x >= this.size || y >= this.size) return null;
        return this.cells[this.getIndex(x, y)];
    }

    getCellByIndex(index: number): Cell | null {
        if (index < 0 || index >= this.size*this.size) return null;
        return this.cells[index];
    }

    setCell(x: number, y: number, type: CellType, value: number | null = null) {
        const cell = this.getCell(x, y);
        if (!cell) return;

        cell.type = type;
        cell.value = value;
    }

    getNeighbor(cell: Cell, direction: Direction): Cell | null {
        const vector = DirectionVector[direction];
        return this.getCell(cell.x + vector.x, cell.y + vector.y);
    }

    capCellInDirection(cell: Cell, direction: Direction, capWith: CellType.Vision | CellType.Blocker = CellType.Blocker) {
        let currentCell = this.getNeighbor(cell, direction);
        while (currentCell) {
            if (currentCell.type === CellType.Blocker) break;

            if (currentCell.type === CellType.None) {
                currentCell.type = capWith;
                break;
            }

            currentCell = this.getNeighbor(currentCell, direction);
        }
    }

    capCellInAllDirections(cell: Cell, capWith: CellType.Vision | CellType.Blocker = CellType.Blocker) {
        for (const direction of AllDirections) {
            this.capCellInDirection(cell, direction, capWith);
        }
    }

    getNonBlockerCellsInRange(cell: Cell, maximum: number, minimum: number = 1):Cell[] {
        let resultingCells:Cell[] = [];
        
        for (const direction of AllDirections) {
            let distanceFromCell = 0;
            let currentCell = this.getNeighbor(cell, direction);
            while (currentCell && currentCell.type !== CellType.Blocker) {
                distanceFromCell++;
                if (distanceFromCell >= minimum && distanceFromCell <= maximum) resultingCells.push(currentCell);
                currentCell = this.getNeighbor(currentCell, direction);
            }
        }
        return resultingCells;
    }

    forEachCell(func: (cell: Cell) => void) {
        for (const cell of this.cells) {
            func(cell)
        }
    };

    countBlockerCells():number {
        let blockerCount = 0;
        this.forEachCell((cell) => {
            if (cell.type === CellType.Blocker) blockerCount++;
        })
        return blockerCount;
    }

    CloneGrid() {
        const clonedGrid = new Grid(this.size);
        clonedGrid.cells = this.cells.map(cell => new Cell(cell.x, cell.y, cell.type, cell.value));
        return clonedGrid;
    }

    saveGrid(saveSlot:number) {
        this.savedGrids[saveSlot] = { grid: this.CloneGrid() };
    }

    restoreSavedGrid(saveSlot:number) {
        const savedGrid = this.savedGrids[saveSlot];
        if (!savedGrid) return;

        const restoredGrid = savedGrid.grid.CloneGrid()

        this.cells = restoredGrid.cells;
    }

    InitializeNoneAndValueCellsAsVision(shouldOverwriteValues:boolean = false) {
        this.forEachCell((cell) => {
            if (cell.type == CellType.None || (cell.type == CellType.Value && shouldOverwriteValues)) this.setCell(cell.x, cell.y, CellType.Vision);
        });
        //console.log("Filled None " + (shouldOverwriteValues ? "and Value " : "") + "cells with Vision cells");
    }

    KeepValuesUnderGridSize() {
        //console.log("Keeping values under " + this.size);

        let tryAgain = true;
        let attempts = 0;
        let cell:Cell;

        while (tryAgain && attempts++ < 100) {
            tryAgain = false;
            
            let overvaluedCells:Cell[] = [];
            this.forEachCell((cell) => {
                if (cell.type === CellType.Value && cell.value && cell.value > this.size) {
                    overvaluedCells.push(cell);
                }
            });

            shuffleArray(overvaluedCells);

            for (cell of overvaluedCells) {
                if (!cell || cell.type !== CellType.Value || !cell.value) continue;

                

                if (cell.value > this.size) {
                    
                    let availableCuts:Cell[] = this.getNonBlockerCellsInRange(cell, this.size);
                    let cut;
                    let firstCut;

                    shuffleArray(availableCuts);

                    while (!cut && availableCuts.length) {
                        cut = availableCuts.pop();
                        if (!firstCut) firstCut = cut;
                        if (!cut) cut = firstCut;
                        if (cut) {
                            cut.type = CellType.Blocker;
                            cut.value = null;

                            //console.log(`\nCut found at (${cut.x},${cut.y}). Solving Again:`);

                            this.InitializeNoneAndValueCellsAsVision(true);
                            SolveGrid(this);
                            tryAgain = true;
                        } else {
                            //console.log(`No cuts found for cell at (${cell.x}, ${cell.y}) with value ${cell.value}`);
                        }
                        break;
                    }
                }
            }
        }

    }

    BreakDownGridToSolveable() {
        //console.log("\nBreaking down grid to solveable state:");

        this.solved = this.CloneGrid();
        
        let tryAgain = true;
        let attempts = 0;
        const minimumBlockerCells = 1;
        const availableCells: Cell[] = [];

        this.forEachCell((cell) => {
            availableCells.push(cell);
        });

        shuffleArray(availableCells);

        while (tryAgain && availableCells.length && attempts++ < 100) {
            tryAgain = false;
            this.saveGrid(1); // Before

            const temporaryCell = availableCells.pop();
            if (!temporaryCell) continue;
            
            const cell = this.cells[this.getIndex(temporaryCell.x, temporaryCell.y)];

            if (cell.type === CellType.Blocker && this.countBlockerCells() <= minimumBlockerCells) continue;

            //console.log(`\nSelected Cell at (${cell.x}, ${cell.y}) of type ${cell.type}${cell.type === CellType.Value && cell.value ? (" and value " + cell.value) : ""}. ${availableCells.length} available cells remain.`);

            cell.type = CellType.None;
            cell.value = null;

            this.saveGrid(2);

            if (SolveGrid(this)) {
                this.restoreSavedGrid(2);
                tryAgain = true;
            } else {
                this.restoreSavedGrid(1);
                tryAgain = true;
            }
        }
    }

    IsSameAsSolvedGrid(): boolean {
        if (!this.solved) return false;
        for (const cell of this.cells) {
            if (cell.type === CellType.None) return false;
            const solvedCell = this.solved.getCell(cell.x, cell.y);
            if (!solvedCell) return false;
            if ((cell.type === CellType.Blocker && solvedCell.type === CellType.Blocker) || ((cell.type === CellType.Vision || cell.type === CellType.Value) && (solvedCell.type === CellType.Vision || solvedCell.type === CellType.Value))) {} else {
                return false;
            }
        }
        return true;
    }

    static fromJSON(data: {size: number, cells: any[], solved: any}) {
        const solvedGrid = new Grid(data.size);
        console.log(data);
        if (data.solved) {
            solvedGrid.cells = data.solved.cells;
        }
        
        const grid = new Grid(data.size);
        grid.cells = data.cells;
        grid.size = data.size;
        grid.solved = solvedGrid;
        return grid;
    }
}

//#endregion