import { AnalyzeCellPassOne, AnalyzeCellPassTwo } from "./analysis";
import { AllDirections, CellType, Grid } from "./types";

export function SolveGrid(grid: Grid) {
    let tryAgain = true;
    let attempts = 0;

    console.log("Solving Grid");

    while (tryAgain && attempts++ < 100) {
        tryAgain = false;

        for (const cell of grid.cells) {
            AnalyzeCellPassOne(grid, cell);
        }

        for (const cell of grid.cells) {
            AnalyzeCellPassTwo(grid, cell);
            if (!cell.info) return;

            //Convert a dot to a number if it is fully surrounded by None cells
            if (cell.type === CellType.Vision && !cell.info.noneCellsAround) {
                cell.type = CellType.Value;
                cell.value = cell.info.confirmedVisibleCells;
                tryAgain = true;
                break;
            }

            if (cell.type === CellType.Value && cell.value && cell.info.noneCellsAround) {
                //Value already reached; Block all directions
                if (cell.info.isValueReached) {
                    grid.capCellInAllDirections(cell);
                    tryAgain = true;
                    break;
                }

                //Only one direction to go in. Replace first None cell with a Vision cell
                if (cell.info.onlyOnePossibleDirection) {
                    grid.capCellInDirection(cell, cell.info.onlyOnePossibleDirection, CellType.Vision);
                    tryAgain = true;
                    break;
                }

                for (const direction of AllDirections) {
                    const directionalInfo = cell.info.directions[direction];

                    if (directionalInfo.wouldConvertingNoneCellOverflow) {
                        grid.capCellInDirection(cell, direction);
                        tryAgain = true;
                        break;
                    } else if (directionalInfo.noneCellCount && directionalInfo.numberCountAfterNoneCellFound + directionalInfo.maximumPossibleCountInOtherDirections <= cell.value) {
                        //Must replace None cell with Vision cell in this direction
                        grid.capCellInDirection(cell, direction, CellType.Vision);
                        tryAgain = true;
                        break;
                    }
                }

                if (tryAgain) break;
            }

            //Isolated None cell; Replace with Blocker cell
            if (cell.type === CellType.None && !cell.info.noneCellsAround && !cell.info.confirmedVisibleCells) {
                cell.type = CellType.Blocker;
                tryAgain = true;
                break;
            }
        }
    }

    console.log("Grid Solved in " + attempts + " attempts");
}