"use client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPalette } from '@fortawesome/free-solid-svg-icons';
import { motion } from "framer-motion";

export default function ThemeButton() {

    function cycleTheme() {
        
    }

    return (
        <motion.button className="fixed top-15 right-15 cursor-pointer text-gray-400"
        whileHover={{x:-10, scale: 1.1, color: "var(--color-gray-200)"}}
        whileFocus={{x:-10, scale: 1.1, color: "var(--color-gray-200)"}}
        whileTap={{x:-5, scale: 0.95}}
        transition={{ type: "spring", stiffness: 300 }}
        onClick={cycleTheme}
        >
            <FontAwesomeIcon icon={faPalette} size="2xl"/>
        </motion.button>
            

    );
}