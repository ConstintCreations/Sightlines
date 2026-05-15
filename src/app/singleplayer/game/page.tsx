"use client";
import BackArrow from "@/app/components/backArrow";
import SingleplayerGrid from "@/app/components/singleplayerGrid";
import { Suspense } from "react";

export default function Game() {
    return (
        <div className="flex flex-col items-center justify-center flex-1">
            <BackArrow />
            <Suspense>
                <SingleplayerGrid />
            </Suspense>
        </div>
    );
}