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
            className={`inline-block hover:cursor-pointer text-4xl flex flex-col justify-center items-center text-center ${fascinateInline.className} text-[var(--unfocused-text)] focus:outline-none hover:text-[var(--focused-text)] focus-visible:text-[var(--focused-text)] transition-colors duration-300`}
            whileHover={{y:-10, scale: 1.1}}
            whileFocus={{y:-10, scale: 1.1}}
            whileTap={{y:-5, scale: 0.95}}
            transition={{ type: "spring", stiffness: 300 }}
        >
            <p>{data.text}</p>
            {data.comingSoon ? <p className="text-2xl text-center mt-2">(Coming Soon)</p> : ""}
        </motion.a>
    );
}