"use client";
import { motion, useAnimation, Variants } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function singleplayerGrid() {
    const searchParams = useSearchParams();
    const inSize = searchParams.get("size");

    useEffect(() => {
        if (!inSize || isNaN(Number(inSize)) || Number(inSize) < 4 || Number(inSize) > 9 || !Number.isInteger(Number(inSize))) {
            window.location.href = "/singleplayer";
        }
    }, [inSize]);
    if (!inSize || isNaN(Number(inSize)) || Number(inSize) < 4 || Number(inSize) > 9 || !Number.isInteger(Number(inSize))) return null;

    const size = Number(inSize);

    const cellColors = ["--color-zinc-800", "--color-cyan-700", "--color-orange-700"];
    const [colorIndex, setColorIndex] = useState<number[]>([]);
    useEffect(() => {
        setColorIndex(
            Array(size*size).fill(0).map(() => Math.floor(Math.random() * cellColors.length))
        )
    }, [size]);

    const delayTime = -0.0075*size + 0.08;
    let fontSize = (-0.14*size + 2.76).toFixed(2);

    const controls = useAnimation();
    const [animationDone, setAnimationDone] = useState(false);

    useEffect(() => {
        (async () => {
                await controls.start({scale: 0, transition:{duration: 0}});
                setAnimationDone(true);
                await controls.start("visible");
                controls.start({scale: 1});
                
            }
        ) ();
    }, [controls]);

    const gridVariants:Variants = {
        visible: (index) => ({scale:1, transition: { type: "spring", stiffness: 200, duration: 0.3, delay: (index%size + Math.floor(index/size)) * delayTime }}),
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
                    onTap={(e) => {
                        console.log(e);
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
                    {colorIndex[index] == 1 && index%2==0 ? index+1 : ""}
                </motion.div>
            ))}
        </div>
    );
}