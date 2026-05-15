"use client";
import { useTheme } from "./theme";
import { motion, AnimatePresence } from "framer-motion";

export default function TitleTagline() {
    const { theme } = useTheme();
    return (
        <AnimatePresence>
            {theme === 'winter' &&
                <motion.span className="text-3xl block text-center"
                    initial={{height: 0, opacity: 0, marginTop: 0}}
                    animate={{height: "auto", opacity: 1, marginTop: "0.5rem"}}
                    exit={{height: 0, opacity: 0, marginTop: 0}}
                    transition={{ duration: 0.3 }}
                >(0h Sn0w)</motion.span>
            }
        </AnimatePresence>
    );
}