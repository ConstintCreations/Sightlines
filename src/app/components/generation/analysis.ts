import { CellInfo, DirectionalCellInfo, Grid, Cell, CreateCellInfo, Direction, AllDirections, DirectionVector, CellType } from "./types";

export function AnalyzeCellPassOne(grid: Grid, cell: Cell): CellInfo | null {
    if (!cell || !grid) return null;
    let cellInfo = CreateCellInfo();

    const possibleDirections = new Set<Direction>();
    let possibleDirectionCount = 0;

    for (const direction of AllDirections) {

        const directionalInfo = cellInfo.directions[direction];

        let currentCell = grid.getNeighbor(cell, direction)

        while (currentCell && currentCell.type !== CellType.Blocker) {
            
            if (currentCell.type === CellType.None) {
                // Is this the first None cell in this direction?
                if (directionalInfo.noneCellCount === 0) {
                    directionalInfo.valueWhenConvertingFirstNoneCellToVision++;
                }

                directionalInfo.noneCellCount++;
                directionalInfo.maximumPossibleValue++;
                cellInfo.noneCellsAround++;

                // If this is a Value cell, add this direction to possible directions
                if (cell.type === CellType.Value) {
                    if (!possibleDirections.has(direction)) {
                        possibleDirections.add(direction);
                        possibleDirectionCount++;
                    }
                }
            } else if (currentCell.type === CellType.Value || currentCell.type === CellType.Vision) {
                directionalInfo.maximumPossibleValue++;

                if (!directionalInfo.noneCellCount) {
                    cellInfo.confirmedVisibleCells++;
                    directionalInfo.valueWhenConvertingFirstNoneCellToVision++;
                } else if (cell.type === CellType.Value && directionalInfo.noneCellCount === 1) {
                    // Only 1 None cell between current Vision/Value and Value cells
                    directionalInfo.numberCountAfterNoneCellFound++;
                    directionalInfo.valueWhenConvertingFirstNoneCellToVision++;
                    if (cell.value && directionalInfo.numberCountAfterNoneCellFound + 1 > cell.value) {
                        directionalInfo.wouldConvertingNoneCellOverflow = true;
                    }
                }
            }

            currentCell = grid.getNeighbor(currentCell, direction);
        }
    }

    if (possibleDirectionCount === 1) {
        cellInfo.onlyOnePossibleDirection = [...possibleDirections][0];
    }

    if (cell.type === CellType.Value) {
        if (cell.value === cellInfo.confirmedVisibleCells) {
            cellInfo.isValueReached = true;
        } else if (cell.value === cellInfo.confirmedVisibleCells + cellInfo.noneCellsAround) {
            cellInfo.canBeReachedWithNoneCells = true;
        }
    }

    return cellInfo;
}


export function AnalyzeCellPassTwo(grid: Grid, cell: Cell, cellInfoMap: Map<Cell, CellInfo>): CellInfo | null {
    if (!cell || !grid) return null;

    return cellInfoMap.get(cell) || null;
}