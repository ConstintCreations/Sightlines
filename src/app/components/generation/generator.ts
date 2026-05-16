import { Grid } from "./types";
import { SolveGrid } from "./solver";

export function generatePuzzleWithSolution(size: number) {
    const grid = new Grid(size);
    grid.InitializeNoneAndValueCellsAsVision();
    SolveGrid(grid);
    grid.KeepValuesUnderGridSize();
    const solutionGrid = grid.CloneGrid();
    grid.BreakDownGridToSolveable();
    return { grid: grid, solutionGrid: solutionGrid };
}