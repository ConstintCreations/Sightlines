"use client";
import { motion } from "framer-motion";

export default function CustomLink(data: { href: string; text: string; color?: "blue" | "lime" }) {
    const colorVariants = {
        blue: "text-blue-400",
        lime: "text-lime-400",
    };

    const textColor = data.color ? colorVariants[data.color] : colorVariants.blue;
    return (
        <motion.a 
            className={`px-1 ${textColor} inline-block focus:outline-none`} href={data.href} target="_blank"
            whileHover="hover" 
            whileFocus="hover"
            whileTap="tap"
            initial="rest" 
        >
            {data.text.split("").map((char, index) => (
                <motion.span
                    className="inline-block"
                    key={index}
                    custom={index}
                    variants = {
                        {
                            rest: { fontWeight: 400, y: 0, scale: 1, color: `var(--color-${data.color ? data.color : "blue"}-400)` },
                            hover: (index) => (
                                { fontWeight: 400, y: -5, scale: 1.1, color: `var(--color-${data.color ? data.color : "blue"}-300)`, transition: { type: "spring", stiffness: 400, delay: data.text.length < 8 ? index * 0.03 : index * 0.015 , damping:20 } }
                            ),
                            tap: (index) => (
                                { fontWeight: 700, transition: { type: "spring", stiffness: 400, delay: data.text.length < 8 ? index * 0.03 : index * 0.015 , damping:20 } }
                            ),
                        }
                    }
                >
                    {char == " " ? "\u00A0" : char}
                </motion.span>
            ))}
        </motion.a>
    );
}