//#region Helpers

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

    forEachCell(func: (cell: Cell) => void) {
        for (const cell of this.cells) {
            func(cell)
        }
    };

    InitializeNoneAndValueCellsAsVision(shouldOverwriteValues:boolean = false) {
        this.forEachCell((cell) => {
            if (cell.type == CellType.None || (cell.type == CellType.Value && shouldOverwriteValues)) this.setCell(cell.x, cell.y, CellType.Vision);
        });
        console.log("Filled None " + (shouldOverwriteValues ? "and Value " : "") + "cells with Vision cells");
    }

    KeepValuesUnderGridSize() {
        console.log("Keeping values under " + this.size);
    }

    BreakDownGridToSolveable() {
        console.log("Breaking down grid to solveable state");
    }

    CloneGrid() {
        const clonedGrid = new Grid(this.size);
        clonedGrid.cells = this.cells.map(cell => new Cell(cell.x, cell.y, cell.type, cell.value));
        return clonedGrid;
    }
}

//#endregion