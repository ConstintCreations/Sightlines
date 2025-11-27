import { Server } from "socket.io";

export default function SocketHandler(request: any, response: any) {
    if (response.socket.server.io) {
        response.end();
        return;
    }

    const io = new Server(response.socket.server);
    response.socket.server.io = io;

    type newEloCalculation = { totalDifference: number; baseChange: number; size: number; randomFactor: number; newPlayerMultiplier: boolean; newElo: number; };

    type User = {
        id: string;
        size: number | "any";
        elo: number;
        gamesPlayed: number;
        newEloCalculation?: newEloCalculation;
        finishedTime?: number;
        completed: boolean;
    }

    let queue: User[] = [];

    function calculateEloGainLoss(player: User, opponent: User, size: number): [newEloCalculation, newEloCalculation] {
        const playerElo = player.elo;
        const opponentElo = opponent.elo;

        const randomFactor = Math.floor(Math.random() * 6) + 1;

        let winEloChange:newEloCalculation = {
            totalDifference: 0,
            baseChange: 0,
            size: 1 + 0.1*(size-4),
            randomFactor: randomFactor,
            newPlayerMultiplier: player.gamesPlayed <= 5,
            newElo: 0
        };

        let lossEloChange:newEloCalculation = {
            totalDifference: 0,
            baseChange: 0,
            size: 1 - 0.05*(size-4),
            randomFactor: randomFactor,
            newPlayerMultiplier: player.gamesPlayed <= 5,
            newElo: 0
        };

        const kFactor = 32;
        const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
        winEloChange.baseChange = Math.round(kFactor * (1 - expectedScore));
        winEloChange.baseChange = Math.round(kFactor * (0 - expectedScore));

        winEloChange.newElo = playerElo + Math.floor((winEloChange.baseChange + winEloChange.randomFactor) * winEloChange.size  * (winEloChange.newPlayerMultiplier ? 2 : 1));
        lossEloChange.newElo = playerElo - Math.floor((lossEloChange.baseChange  + lossEloChange.randomFactor) * lossEloChange.size * (lossEloChange.newPlayerMultiplier ? 0.5 : 1));

        winEloChange.totalDifference = winEloChange.newElo - playerElo;
        lossEloChange.totalDifference = lossEloChange.newElo - playerElo;

        return [winEloChange, lossEloChange];
    }

    io.on("connection", (socket) => {
        console.log("New client connected:", socket.id);

        socket.on("joinQueue", (data) => {
            console.log(`Client ${socket.id} joined queue for size ${data.size}`);
            const newUser: User = {
                id: socket.id,
                size: data.size,
                elo: data.elo,
                gamesPlayed: data.gamesPlayed,
                completed: false
            };
            queue.push(newUser);
            // Look for a match
            for (let i = 0; i < queue.length; i++) {
                const potentialMatch = queue[i];
                if (potentialMatch.id !== newUser.id && (newUser.size === "any" || potentialMatch.size === "any" || newUser.size === potentialMatch.size)) {
                    // Match found
                    const matchedUser = potentialMatch;

                    queue = queue.filter(user => user.id !== newUser.id && user.id !== matchedUser.id);

                    console.log(`Match found between ${newUser.id} and ${matchedUser.id}`);
                    let gameSize: number;
                    if (newUser.size === "any" && matchedUser.size === "any") {
                        gameSize = Math.floor(Math.random() * 6) + 4;
                    } else if (newUser.size === "any") {
                        gameSize = matchedUser.size as number;
                    } else if (matchedUser.size === "any") {
                        gameSize = newUser.size as number;
                    } else {
                        gameSize = newUser.size as number;
                    }

                    const [newUserWinEloChange, newUserLossEloChange] = calculateEloGainLoss(newUser, matchedUser, gameSize);
                    const [matchedUserWinEloChange, matchedUserLossEloChange] = calculateEloGainLoss(matchedUser, newUser, gameSize);

                    // Generate a grid here

                    socket.to(newUser.id).emit("playGame", {
                        size: gameSize,
                        // grid: [],
                        tempElo: newUserLossEloChange.newElo, // both start as losers for if they quit early
                        newGamesPlayed: newUser.gamesPlayed + 1
                    });

                    socket.to(matchedUser.id).emit("playGame", {
                        size: gameSize,
                        // grid: [],
                        tempElo: matchedUserLossEloChange.newElo, // both start as losers for if they quit early
                        newGamesPlayed: matchedUser.gamesPlayed + 1
                    });

                    socket.on("timerStopped", (data) => {
                        const elapsedTime = data.elapsed;
                        const gridState = data.gridData;

                        let user = socket.id === newUser.id ? newUser : matchedUser;
                        let otherUser = socket.id === newUser.id ? matchedUser : newUser;

                        user.finishedTime = elapsedTime;
                        user.completed = data.completed;

                        if (user.completed) {
                            // Check grid vs server grid solution here to verify completion
                        }

                        console.log(`Client ${socket.id} stopped timer at ${elapsedTime}ms, completed: ${user.completed}`);

                        if (typeof otherUser.finishedTime === "number") {
                            if (user.completed && otherUser.completed) {
                                // Both completed, determine winner
                                if (user.finishedTime! <= otherUser.finishedTime!) {
                                    // User wins

                                    socket.to(user.id).emit("gameFinished", { won: true, newElo: newUserWinEloChange.newElo, newEloCalculation: newUserWinEloChange });
                                    socket.to(otherUser.id).emit("gameFinished", { won: false, newElo: matchedUserLossEloChange.newElo, newEloCalculation: matchedUserLossEloChange });
                                } else if (user.finishedTime! > otherUser.finishedTime!) {
                                    // Other user wins

                                    socket.to(user.id).emit("gameFinished", { won: false, newElo: newUserLossEloChange.newElo, newEloCalculation: newUserLossEloChange });
                                    socket.to(otherUser.id).emit("gameFinished", { won: true, newElo: matchedUserWinEloChange.newElo, newEloCalculation: matchedUserWinEloChange });
                                } 
                            } else if (user.completed && !otherUser.completed) {
                                // User wins by completion

                                socket.to(user.id).emit("gameFinished", { won: true, newElo: newUserWinEloChange.newElo, newEloCalculation: newUserWinEloChange });
                                    socket.to(otherUser.id).emit("gameFinished", { won: false, newElo: matchedUserLossEloChange.newElo, newEloCalculation: matchedUserLossEloChange });
                            } else if (!user.completed && otherUser.completed) {
                                // Other user wins by completion

                                socket.to(user.id).emit("gameFinished", { won: false, newElo: newUserLossEloChange.newElo, newEloCalculation: newUserLossEloChange });
                                socket.to(otherUser.id).emit("gameFinished", { won: true, newElo: matchedUserWinEloChange.newElo, newEloCalculation: matchedUserWinEloChange });
                            } else {
                                // Both failed to complete, no elo change

                                socket.to(user.id).emit("gameFinished", { won: false, newElo: user.elo, newEloCalculation: null });
                                socket.to(otherUser.id).emit("gameFinished", { won: false, newElo: otherUser.elo, newEloCalculation: null });
                            }

                        } else {
                            socket.to(otherUser.id).emit("otherPlayerFinished", { finishedTime: elapsedTime });
                            setTimeout(() => {
                                if (typeof otherUser.finishedTime !== "number") {
                                    if (user.completed) {
                                        socket.to(user.id).emit("gameFinished", { won: true, newElo: newUserWinEloChange.newElo, newEloCalculation: newUserWinEloChange });
                                        socket.to(otherUser.id).emit("gameFinished", { won: false, newElo: matchedUserLossEloChange.newElo, newEloCalculation: matchedUserLossEloChange });
                                    }
                                }
                            }, 3000);
                        }

                    });
                }
            }
            io.to(socket.id).emit("queueJoined");
        });

        //socketRef.current.emit("joinQueue", { size: inSizeRaw === "any" ? "any" : inSize, elo: elo, gamesPlayed: gamesPlayed });
    });

    response.end();
}