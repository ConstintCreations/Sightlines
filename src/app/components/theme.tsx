"use client";
import { createContext, useEffect, useState, useContext } from "react";

const ThemeContext = createContext<{theme: string; setTheme: (theme:string) => void}>({ theme: "winter", setTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState("winter");

    useEffect(() => {
        const savedTheme = localStorage.getItem("theme");
        if (savedTheme) {
            setTheme(savedTheme);
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