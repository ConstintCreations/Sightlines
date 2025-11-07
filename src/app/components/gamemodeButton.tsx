"use client";
import { Fascinate_Inline } from 'next/font/google';
import { motion } from "framer-motion";

const fascinateInline = Fascinate_Inline({
    subsets: ['latin'],
    weight: '400',
    variable: '--font-fascinate-inline',
});

export default function GameModeButton(data: {href: string; text: string}) {
    return (
        <motion.a 
            href = {data.href}
            className={`inline-block hover:cursor-pointer text-4xl ${fascinateInline.className} text-gray-400 focus:outline-none`}
            whileHover={{y:-10, scale: 1.1, color: "var(--color-gray-200)"}}
            whileFocus={{y:-10, scale: 1.1, color: "var(--color-gray-200)"}}
            whileTap={{y:-5, scale: 0.95}}
            transition={{ type: "spring", stiffness: 300 }}
        >
            {data.text}
        </motion.a>
    );
}