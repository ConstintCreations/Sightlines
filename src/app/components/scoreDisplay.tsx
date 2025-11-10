"use client";
import { useEffect, useState } from "react";
export default function ScoreDisplay() {
    const [savedScore, setSavedScore] = useState<number>(0);

    useEffect(() => {
        const score = localStorage.getItem('score');
        if (score) {
            setSavedScore(parseInt(score));
        }
    }, []);

    return (
        <p className="mt-40 text-gray-500 text-4xl font-bold">
            {!isNaN(savedScore) && savedScore ? savedScore.toString() : "0"}
        </p>
    )
}