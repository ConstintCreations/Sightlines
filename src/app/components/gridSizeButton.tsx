"use client";
import Link from "next/link";
import { motion } from "framer-motion";

export default function GridSizeButton(data: {size: number, singleplayer: boolean}) {
    const backgroundColor = data.size % 2 == 0 ? "bg-cyan-700 hover:bg-cyan-600" : "bg-orange-700 hover:bg-orange-600";
    return (
        <Link href={data.singleplayer ? `/singleplayer/game?size=${data.size}` : `/multiplayer/lobby?size=${data.size}`}
        >
            <motion.div
                className={`h-[1.75em] aspect-square ${backgroundColor} text-4xl font-bold text-gray-300 rounded-2xl flex items-center justify-center`}
                whileHover= {{scale: 1.15, y:-10}}
                transition={{ type: "spring", stiffness: 300 }}
            >
                {data.size}
            </motion.div>
        </Link>
    );
}