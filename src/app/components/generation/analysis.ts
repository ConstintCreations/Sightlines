import { CellInfo, DirectionalCellInfo, Grid, Cell, CreateCellInfo, Direction, AllDirections, DirectionVector, CellType } from "./types";

export function AnalyzeCellPassOne(grid: Grid, cell: Cell) {
    if (!cell || !grid) return;
    cell.info = CreateCellInfo();

    const possibleDirections = new Set<Direction>();
    let possibleDirectionCount = 0;

    for (const direction of AllDirections) {

        const directionalInfo = cell.info.directions[direction];

        let currentCell = grid.getNeighbor(cell, direction)

        while (currentCell && currentCell.type !== CellType.Blocker) {
            
            if (currentCell.type === CellType.None) {
                // Is this the first None cell in this direction?
                if (directionalInfo.noneCellCount === 0) {
                    directionalInfo.valueWhenConvertingFirstNoneCellToVision++;
                }

                directionalInfo.noneCellCount++;
                directionalInfo.maximumPossibleValue++;
                cell.info.noneCellsAround++;

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
                    cell.info.confirmedVisibleCells++;
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
        cell.info.onlyOnePossibleDirection = [...possibleDirections][0];
    }

    if (cell.type === CellType.Value) {
        if (cell.value === cell.info.confirmedVisibleCells) {
            cell.info.isValueReached = true;
        } else if (cell.value === cell.info.confirmedVisibleCells + cell.info.noneCellsAround) {
            cell.info.canBeReachedWithNoneCells = true;
        }
    }
}


export function AnalyzeCellPassTwo(grid: Grid, cell: Cell) {
    if (!cell || !grid || !cell.info) return;
    
    for (const direction of AllDirections) {

        const directionalInfo = cell.info.directions[direction];

        let currentCell = grid.getNeighbor(cell, direction)

        while (currentCell && currentCell.type !== CellType.Blocker) {

            if (currentCell.type === CellType.Value && currentCell.info?.isValueReached) cell.info.valueReachedCellsAround = true;

            currentCell = grid.getNeighbor(currentCell, direction);
        }

        if (cell.type === CellType.Value && !cell.info.isValueReached && directionalInfo.noneCellCount) {
            directionalInfo.maximumPossibleCountInOtherDirections = 0;
            for (const otherDirection of AllDirections) {
                if (otherDirection !== direction) {
                    directionalInfo.maximumPossibleCountInOtherDirections += cell.info.directions[otherDirection].maximumPossibleValue;
                }
            }
        }
    }

    if (cell.type === CellType.Value) {
        if (cell.value === cell.info.confirmedVisibleCells) {
            cell.info.isValueReached = true;
        } else if (cell.value === cell.info.confirmedVisibleCells + cell.info.noneCellsAround) {
            cell.info.canBeReachedWithNoneCells = true;
        }
    }

}