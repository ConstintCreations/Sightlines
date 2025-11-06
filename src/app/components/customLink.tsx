"use client";
import { motion } from "framer-motion";
import Link from "next/link";

export default function CustomLink(data: { href: string; text: string; color?: string }) {
    console.log(data);
    return (
        <Link className={`px-1 text-${data.color ? data.color : "blue"}-400 hover:text-${data.color ? data.color : "blue"}-300`} href={data.href} target="_blank">
            <motion.div 
                className="inline-block" 
                whileHover="hover" 
                initial="rest" 
            >
                {data.text.split("").map((char, index) => (
                    <motion.span
                        className="inline-block"
                        key={index}
                        custom={index}
                        variants = {
                            {
                                rest: { y: 0, scale: 1 },
                                hover: (index) => (
                                    { y: -5, scale: 1.1, transition: { type: "spring", stiffness: 400, delay: index * 0.03, damping:20 } }
                                )
                            }
                        }
                    >
                        {char == " " ? "\u00A0" : char}
                    </motion.span>
                ))}
            </motion.div>
        </Link>
    );
}