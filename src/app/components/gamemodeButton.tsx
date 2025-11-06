"use client";
import { Fascinate_Inline } from 'next/font/google';
import Link from "next/link";
import { motion } from "framer-motion";

const fascinateInline = Fascinate_Inline({
    subsets: ['latin'],
    weight: '400',
    variable: '--font-fascinate-inline',
});

export default function GameModeButton(data: {href: string; text: string}) {
    return (
        <Link
            href = {data.href}
            className = {`hover:cursor-pointer text-4xl ${fascinateInline.className} text-gray-400 hover:text-gray-200 transition-all duration-300`}
        >
            <motion.div 
                className="inline-block" 
                whileHover= {{y:-10, scale: 1.1}}
                transition={{ type: "spring", stiffness: 300 }}
            >
                {data.text}
            </motion.div>
            
        </Link>
    );
}