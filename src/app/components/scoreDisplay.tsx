"use client";
import { useEffect, useState } from "react";
export default function ScoreDisplay( { singleplayer }: { singleplayer: boolean } ) {
    const [savedScore, setSavedScore] = useState<number>(0);

    useEffect(() => {
        const score = singleplayer ? localStorage.getItem('score') : localStorage.getItem('elo');
        if (score) {
            setSavedScore(parseInt(score));
        }
    }, []);

    return (
        <p className={`${singleplayer == true ? "mt-30" : "mt-20"} text-[var(--alt-text)] text-4xl font-bold`}>
            {!isNaN(savedScore) && savedScore ? savedScore.toString() : singleplayer ? "0" : "1000"}
        </p>
    )
}