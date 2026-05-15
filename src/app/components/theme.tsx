"use client";
import { createContext, useEffect, useState, useContext } from "react";
import { Snowfall } from "react-snowfall";
import { AnimatePresence, motion } from "framer-motion";

const ThemeContext = createContext<{theme: string; setTheme: (theme:string) => void}>({ theme: "regular", setTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState("regular");

    useEffect(() => {
        const savedTheme = localStorage.getItem("theme");
        if (savedTheme) {
            setTheme(savedTheme);
        } else {
            const month = new Date().getMonth();
            if (month === 11) {
                localStorage.setItem('theme', 'winter'); 
                setTheme('winter');
            } else {
                localStorage.setItem('theme', 'regular');
            }
        }
    }, []);

    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        localStorage.setItem("theme", theme);
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}

export function ThemedAdditions() {
    const { theme } = useTheme();

    return (
        <AnimatePresence>
            {theme === "winter" && (
                <motion.div className="fixed inset-0 size-full pointer-events-none z-1000"
                    initial={{opacity: 0}}
                    animate={{opacity: 1}}
                    exit={{opacity: 0}}
                    transition={{ duration: 1 }}
                >
                    <Snowfall />
                </motion.div>
            )}
        </AnimatePresence>
    );
}