"use client";
import { motion } from "framer-motion";

export default function GridSizeButton(data: {size: number | "any", singleplayer: boolean}) {
    
    const backgroundColor = (data.size !== "any" ? data.size : 10) % 2 == 0 ? "bg-[var(--o-tile-unfocused)] hover:bg-[var(--o-tile-focused)] focus-visible:bg-[var(--o-tile-focused)]" : "bg-[var(--x-tile-unfocused)] hover:bg-[var(--x-tile-focused)] focus-visible:bg-[var(--x-tile-focused)]";
    return (
        <motion.a
            href={data.singleplayer ? `/singleplayer/game?size=${data.size}` : `/multiplayer/game?size=${data.size}`}
            className={`h-[1.6em] ${backgroundColor} text-[2.75em] font-bold text-[var(--focused-text)] rounded-2xl flex items-center justify-center focus:outline-none transition-colors duration-300 ${data.size !== "any" ? "aspect-square": "w-full"}`}
            whileHover= {{scale: 1.15, y:-10}}
            whileFocus={{scale: 1.15, y:-10}}
            whileTap={{y: -5, scale: 0.95}}
            transition={{ type: "spring", stiffness: 300 }}
        >
            {data.size}
        </motion.a>
    );
}