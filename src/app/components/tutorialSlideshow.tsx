"use client";
import { motion, useAnimation, Variants } from "framer-motion";
import { useEffect, useState } from "react";

export default function TutorialSlideshow() {
    const dialogues = [
        "These are vision cells. Vision cells can see other vision cells in the same row and column.",
        "These are blocking cells. They block vision cells from seeing other vision cells in the same row and column.",
        "Numbers indicate how many other vision cells a vision cell should see.",
        "For example, this vision cell should see 2 other vision cells.",
        "Click on these cells to place vision cells.",
        "Click twice on this cell to place a blocking cell.",
        "Try to place vision and blocking cells to satisfy all the numbers!",
        "Nice Job! You've completed the tutorial!"
    ]

    
    type SimpleCell = {
        value: "vision" | "block" | number | "empty",
        highlighted?: boolean,
    }

    const gridStates:SimpleCell[][] = [
        [
            {value: "vision"}, {value: "empty"}, {value: "empty"}, {value: "empty"},
            {value: "empty"}, {value: "empty"}, {value: "vision"}, {value: "empty"},
            {value: "empty"}, {value: "empty"}, {value: "empty"}, {value: "vision"},
            {value: "empty"}, {value: "vision"}, {value: "empty"}, {value: "empty"},
        ],
        [
            {value: "vision"}, {value: "empty"}, {value: "empty"}, {value: "empty"},
            {value: "block"}, {value: "empty"}, {value: "vision"}, {value: "empty"},
            {value: "empty"}, {value: "empty"}, {value: "empty"}, {value: "vision"},
            {value: "empty"}, {value: "vision"}, {value: "empty"}, {value: "block"},
        ],
        [
            {value: 2}, {value: "empty"}, {value: "empty"}, {value: "empty"},
            {value: "block"}, {value: "empty"}, {value: 3}, {value: "empty"},
            {value: "empty"}, {value: "empty"}, {value: "empty"}, {value: 4},
            {value: "empty"}, {value: 2}, {value: "empty"}, {value: "block"},
        ],
        [
            {value: 2, highlighted: true}, {value: "empty"}, {value: "empty"}, {value: "empty"},
            {value: "block"}, {value: "empty"}, {value: 3}, {value: "empty"},
            {value: "empty"}, {value: "empty"}, {value: "empty"}, {value: 4},
            {value: "empty"}, {value: 2}, {value: "empty"}, {value: "block"},
        ],
        [
            {value: 2}, {value: "empty", highlighted: true}, {value: "empty", highlighted: true}, {value: "empty"},
            {value: "block"}, {value: "empty"}, {value: 3}, {value: "empty"},
            {value: "empty"}, {value: "empty"}, {value: "empty"}, {value: 4},
            {value: "empty"}, {value: 2}, {value: "empty"}, {value: "block"},
        ],
        [
            {value: 2}, {value: "vision"}, {value: "vision"}, {value: "empty", highlighted: true},
            {value: "block"}, {value: "empty"}, {value: 3}, {value: "empty"},
            {value: "empty"}, {value: "empty"}, {value: "empty"}, {value: 4},
            {value: "empty"}, {value: 2}, {value: "empty"}, {value: "block"},
        ],
        [
            {value: 2}, {value: "vision"}, {value: "vision"}, {value: "block"},
            {value: "block"}, {value: "empty", highlighted: true}, {value: 3}, {value: "empty", highlighted: true},
            {value: "empty", highlighted: true}, {value: "empty", highlighted: true}, {value: "empty", highlighted: true}, {value: 4},
            {value: "empty", highlighted: true}, {value: 2}, {value: "empty", highlighted: true}, {value: "block"},
        ],
        [
            {value: 2}, {value: "vision"}, {value: "vision"}, {value: "block"},
            {value: "block"}, {value: "block"}, {value: 3}, {value: "vision"},
            {value: "vision"}, {value: "vision"}, {value: "vision"}, {value: 4},
            {value: "vision"}, {value: 2}, {value: "block"}, {value: "block"},
        ]
    ]

    type Action = {
        type: "placeVision" | "placeBlock" | "none" | "highlight",
        index?: number
    }

    type Step = {
        dialogue: string,
        grid: SimpleCell[],
        actions: Action[],
    }

    const steps:Step[] = [
        {
            dialogue: dialogues[0],
            grid: gridStates[0],
            actions: [{type: "none"}]
        },
        {
            dialogue: dialogues[1],
            grid: gridStates[1],
            actions: [{type: "none"}]
        },
        {
            dialogue: dialogues[2],
            grid: gridStates[2],
            actions: [{type: "none"}]
        },
        {
            dialogue: dialogues[3],
            grid: gridStates[3],
            actions: [{type: "highlight", index: 0}]
        },
        {
            dialogue: dialogues[4],
            grid: gridStates[4],
            actions: [{type: "placeVision", index: 1}, {type: "placeVision", index: 2}]
        },
        {
            dialogue: dialogues[5],
            grid: gridStates[5],
            actions: [{type: "placeBlock", index: 3}]
        },
        {
            dialogue: dialogues[6],
            grid: gridStates[6],
            actions: [{type: "placeBlock", index: 5}, {type: "placeBlock", index: 15}, {type: "placeVision", index: 12}, {type: "placeVision", index:7}, {type: "placeVision", index: 8}, {type: "placeVision", index: 9}, {type: "placeVision", index: 10}, {type: "placeBlock", index: 14}]
        },
        {
            dialogue: dialogues[7],
            grid: gridStates[7],
            actions: [{type: "none"}]
        }
    ]

    /*
        2OOX
        XX3O
        XOO4
        O2XX
    */

    const [currentStep, setCurrentStep] = useState(0);
    const [gridData, setGridData] = useState<SimpleCell[]>(steps[0].grid);
    const [actions, setActions] = useState<Action[]>(steps[0].actions);

    useEffect(() => {
        if (currentStep >= steps.length) {
            window.location.href = "/";
            return;
        };
        setGridData(steps[currentStep].grid);
        setActions(steps[currentStep].actions);
    }, [currentStep]);

    const cellColors = ["--empty-cell", "--o-cell", "--x-cell"];
    const [colorIndex, setColorIndex] = useState<number[]>([]);
    useEffect(() => {
        if (gridData.length === 0) return;
        setColorIndex(Array.from({ length: 4 * 4 }).map((_, index) => {
            if (gridData[index].value == "empty") return 0;
            if (gridData[index].value == "block") return 2;
            return 1;
        }));

    }, [gridData]);

    const delayTime = -0.0075*4 + 0.08;
    let fontSize = (-0.14*4 + 2.76).toFixed(2);

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
        visible: (index) => ({scale:1, filter: "brightness(1)", transition: { type: "spring", stiffness: 200, duration: 0.3, delay: (index%4 + Math.floor(index/4)) * delayTime }}),
        hover: { scale: 1.1, y:-8, filter: "brightness(1.2)", transition: { type: "spring", stiffness: 300 }},
        tap: { scale: 1.15, y:-16, transition: { type: "spring", stiffness: 300 }},
    };

    useEffect(() => {
        const handleContextMenu = (e: MouseEvent) => e.preventDefault();
        document.addEventListener("contextmenu", handleContextMenu);
        return () => document.removeEventListener("contextmenu", handleContextMenu);
    }, []);

    function clickCell(index: number, type: "left" | "right") {
        const clickedCell = gridData[index];
        for (let action of actions) {
            if (action.index === index && (action.type === "placeVision" || action.type === "placeBlock") && (clickedCell.value == "empty" || clickedCell.value == "vision")) {
                if (action.type === "placeVision" && type === "left" && clickedCell.value == "empty") {
                    clickedCell.value = "vision";
                    clickedCell.highlighted = false;
                    setGridData([...gridData]);
                } else if (action.type === "placeBlock" && clickedCell.value == "empty") {
                    if (type === "right") {
                        clickedCell.value = "block";
                        clickedCell.highlighted = false;
                        setGridData([...gridData]);
                    } else if (type === "left") {
                        clickedCell.value = "vision";
                        setGridData([...gridData]);
                    }
                } else if (action.type === "placeBlock" && clickedCell.value == "vision" && type === "left") {
                    clickedCell.value = "block";
                    clickedCell.highlighted = false;
                    setGridData([...gridData]);
                }
                break;
            }

        }

        const allDone = actions.every((action) => {
            if (action.type === "placeVision" || action.type === "placeBlock") {
                const cell = gridData[action.index!];
                if (action.type === "placeVision" && cell.value !== "vision") return false;
                if (action.type === "placeBlock" && cell.value !== "block") return false;
            }
            return true;
        });
        if (allDone) setCurrentStep(currentStep+1);
    }

    return (
        <div className={`w-full h-full flex flex-col gap-15 justify-center items-center ${actions.length === 1 && (actions[0].type === "none" || actions[0].type === "highlight") ? "cursor-pointer" : ""}`} onClick={() => {
            if (actions.length === 1 && (actions[0].type === "none" || actions[0].type === "highlight")) {
                setCurrentStep(currentStep+1);
            }
        }}>
            <motion.div className="w-[30vw] text-3xl text-center font-bold"
                layout
                transition={{type:"spring", stiffness: 100}}
            >
                {dialogues[currentStep]}
            </motion.div>
            <motion.div className="grid gap-2" style={{ gridTemplateColumns: `repeat(4, minmax(0, 1fr))`}}
                layout
                transition={{type:"spring", stiffness: 100}}
            >
                {Array.from({ length: 16 }).map((_, index) => (
                    <motion.div
                        key={index}
                        custom={index}
                        className={`h-[2.2em] aspect-square font-bold text-[var(--focused-text)] rounded-[30%] flex items-center justify-center cursor-pointer select-none ${gridData[index].highlighted ? "outline-[var(--foreground)] outline outline-6 -outline-offset-4" : "focus:outline-none"}`}        
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
            </motion.div>
        </div>
    )
}