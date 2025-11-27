"use client";
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useSearchParams } from "next/navigation";

let socket: Socket;

export default function MultiplayerGame() {
    const searchParams = useSearchParams();
    const inSizeRaw = searchParams?.get("size");
    const inSize = Number(inSizeRaw);
    useEffect(() => {
        if ((!inSize || isNaN(Number(inSize)) || Number(inSize) < 4 || Number(inSize) > 9 || !Number.isInteger(Number(inSize))) && inSizeRaw !== "any") {
            window.location.href = "/multiplayer";
        } else {
            fetch('/api/socket');
            socket = io();

            socket.on("connect", () => {
                console.log("Connected to server with ID:", socket.id);
            });

            socket.emit("joinQueue", { size: inSizeRaw === "any" ? "any" : inSize });

            socket.on("queueJoined", () => {
                setStatus("waiting");
            });

            socket.on("matchFound", () => {
                setStatus("joining");
            });

            return () => {
                socket.disconnect();
            };
        }
    }, [inSize]);

    type Statuses = "connecting" | "waiting" | "joining";
    const [status, setStatus] = useState<Statuses>("connecting");
    const statusMessages: Record<Statuses, string> = {
        "connecting": "Connecting to server...",
        "waiting": "Waiting for another player...",
        "joining": "Joining game..."
    };

    useEffect(() => {
        

    }, []);

    return (
        <div className="flex flex-col items-center justify-center flex-1">
            <h1 className="text-6xl font-bold">{statusMessages[status]}</h1>
        </div>
    );
}