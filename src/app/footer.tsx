"use client";
import Link from "next/link";
import { motion } from "framer-motion";

export default function Footer() {
    return (
        <footer className="w-full py-4 border-t border-gray-500 mt-8 flex justify-center items-center text-sm text-gray-500 fixed bottom-0">
            Created by 
            <Link className="px-1 text-blue-400 hover:text-blue-300" href ="https://github.com/ConstintCreations" target="_blank">
                <motion.div 
                    className="inline-block" 
                    whileHover="hover" 
                    initial="rest" 
                >
                    {"ConstintCreations".split("").map((char, index) => (
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
                            {char}
                        </motion.span>
                    ))}
                </motion.div>
            </Link>
            | Inspired by 
            <Link className="px-1 text-blue-400 hover:text-blue-300" href ="https://0hn0.com/" target="_blank">
                <motion.div 
                    className="inline-block" 
                    whileHover="hover" 
                    initial="rest" 
                >
                    {"0h\u00A0n0".split("").map((char, index) => (
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
                            {char}
                        </motion.span>
                    ))}
                </motion.div>
            </Link> 
            by 
            <Link className="px-1 text-lime-400 hover:text-lime-300" href ="https://www.q42.nl/en" target="_blank">
                <motion.div 
                    className="inline-block" 
                    whileHover="hover" 
                    initial="rest" 
                >
                    {"Q42".split("").map((char, index) => (
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
                            {char}
                        </motion.span>
                    ))}
                </motion.div>
            </Link>
        </footer>
    );
}