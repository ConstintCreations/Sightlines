import { Grid, CellType } from "./types";
import { SolveGrid } from "./solver";

export function generatePuzzleWithSolution(size: number) {
    //console.log("======Generating Grid======\n");
    //console.log("Generating new puzzle of size " + size);
    const grid = new Grid(size);
    grid.InitializeNoneAndValueCellsAsVision();
    ////console.log("");
    SolveGrid(grid);
    //console.log("");
    grid.KeepValuesUnderGridSize();
    const solutionGrid = grid.CloneGrid();
    //console.log("\nCloned Grid in Solved State")
    grid.BreakDownGridToSolveable();

    //console.log("\n===========================\n");
    //console.log("Final Grids:")

    //printGridToConsole(grid, "Unsolved Grid");
    //printGridToConsole(solutionGrid, "Solved Grid");

    //console.log("");
    
    return { grid: grid, solutionGrid: solutionGrid };
}

export function printGridToConsole(grid: Grid, label: string | null = null) {

    if (label) {
        console.log("\n" + label + "\n");
    }

    for (let y = 0; y < grid.size; y++) {
        let stringToPrint = "";
        for (let x = 0; x < grid.size; x++) {
            const cell = grid.getCell(x, y);
            if (!cell) return;
            if (cell.type == CellType.Blocker) stringToPrint += "X";
            if (cell.type == CellType.None) stringToPrint += "-";
            if (cell.type == CellType.Vision) stringToPrint += "O";
            if (cell.type == CellType.Value && cell.value) stringToPrint += cell.value.toString();
            if (cell.type == CellType.Value && !cell.value) stringToPrint += "!";
        }

        console.log(stringToPrint);
    }
}