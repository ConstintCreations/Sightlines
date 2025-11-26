"use client";
import { motion } from "framer-motion";

export default function GridSizeButton(data: {size: number, singleplayer: boolean}) {
    const backgroundColor = data.size % 2 == 0 ? "bg-[var(--o-tile-unfocused)] hover:bg-[var(--o-tile-focused)] focus-visible:bg-[var(--o-tile-focused)]" : "bg-[var(--x-tile-unfocused)] hover:bg-[var(--x-tile-focused)] focus-visible:bg-[var(--x-tile-focused)]";
    return (
        <motion.a
            href={data.singleplayer ? `/singleplayer/game?size=${data.size}` : `/multiplayer/lobby?size=${data.size}`}
            className={`h-[1.6em] aspect-square ${backgroundColor} text-[2.75em] font-bold text-[var(--focused-text)] rounded-2xl flex items-center justify-center focus:outline-none transition-colors duration-300`}
            whileHover= {{scale: 1.15, y:-10}}
            whileFocus={{scale: 1.15, y:-10}}
            whileTap={{y: -5, scale: 0.95}}
            transition={{ type: "spring", stiffness: 300 }}
        >
            {data.size}
        </motion.a>
    );
}