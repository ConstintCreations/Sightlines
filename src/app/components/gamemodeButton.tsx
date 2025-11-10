"use client";
import { Fascinate_Inline } from 'next/font/google';
import { motion } from "framer-motion";

const fascinateInline = Fascinate_Inline({
    subsets: ['latin'],
    weight: '400',
    variable: '--font-fascinate-inline',
});

export default function GameModeButton(data: {href: string; text: string, comingSoon?: boolean}) {
    return (
        <motion.a 
            href = {data.href}
            className={`inline-block hover:cursor-pointer text-4xl flex flex-col justify-center items-center text-center ${fascinateInline.className} text-gray-400 focus:outline-none`}
            whileHover={{y:-10, scale: 1.1, color: "var(--color-gray-200)"}}
            whileFocus={{y:-10, scale: 1.1, color: "var(--color-gray-200)"}}
            whileTap={{y:-5, scale: 0.95}}
            transition={{ type: "spring", stiffness: 300 }}
        >
            <p>{data.text}</p>
            {data.comingSoon ? <p className="text-2xl text-center mt-2">(Coming Soon)</p> : ""}
        </motion.a>
    );
}