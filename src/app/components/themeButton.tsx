"use client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPalette } from '@fortawesome/free-solid-svg-icons';
import { motion } from "framer-motion";
import { useTheme } from "./theme";

export default function ThemeButton() {
    const { theme, setTheme } = useTheme();
    const themes = ["default", "winter"];

    const cycleTheme = () => {
        setTheme(themes[(themes.indexOf(theme) + 1) % themes.length]);
    }

    return (
        <motion.button className="fixed top-15 right-15 cursor-pointer text-[var(--unfocused-text)] hover:text-[var(--focused-text)] focus:outline-none focus-visible:text-[var(--focused-text)] transition-colors duration-300"
        whileHover={{x:-10, scale: 1.1}}
        whileFocus={{x:-10, scale: 1.1}}
        whileTap={{x:-5, scale: 0.95}}
        transition={{ type: "spring", stiffness: 300 }}
        onClick={cycleTheme}
        >
            <FontAwesomeIcon icon={faPalette} size="2xl"/>
        </motion.button>
            

    );
}