"use client";
import BackArrow from "@/app/components/backArrow";
import { Suspense } from "react";
import MultiplayerGame from "@/app/components/multiplayerGame";

export default function Game() {
    return (
        <div className="flex flex-col items-center justify-center flex-1">
            <BackArrow></BackArrow>
            <Suspense>
                <MultiplayerGame />
            </Suspense>
        </div>
    );
}