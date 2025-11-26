"use client";
import { createContext, useEffect, useState, useContext } from "react";

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