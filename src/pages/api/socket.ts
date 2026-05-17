import { Server } from "socket.io";
import { generatePuzzleWithSolution } from "@/app/components/generation/generator";
import { Grid } from "@/app/components/generation/types";

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
        newEloCalculation?: newEloCalculation[];
        finishedTime?: number;
        completed: boolean;
        gameId?: string;
        ready: boolean;
    }

    let queue: User[] = [];

    type Game = {
        id: string;
        players: User[];
        size: number;
        emptyGrid: Grid;
        grid: Grid;
        state: "ongoing" | "completed";
        finishTimeout?: NodeJS.Timeout;
    }

    let games: { [id: string]: Game } = {};

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
            randomFactor: -randomFactor,
            newPlayerMultiplier: player.gamesPlayed <= 5,
            newElo: 0
        };

        const kFactor = 32;
        const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
        winEloChange.baseChange = Math.round(kFactor * (1 - expectedScore));
        lossEloChange.baseChange = Math.round(kFactor * (0 - expectedScore));

        winEloChange.newElo = playerElo + Math.floor((winEloChange.baseChange + winEloChange.randomFactor) * winEloChange.size  * (winEloChange.newPlayerMultiplier ? 2 : 1));
        lossEloChange.newElo = playerElo - Math.floor((lossEloChange.baseChange  + lossEloChange.randomFactor) * lossEloChange.size * (lossEloChange.newPlayerMultiplier ? 0.5 : 1));

        winEloChange.totalDifference = winEloChange.newElo - playerElo;
        lossEloChange.totalDifference = playerElo - lossEloChange.newElo;

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
                completed: false,
                ready: false
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

                    console.log(`Starting game of size ${gameSize} between ${newUser.id} and ${matchedUser.id}`);

                    // Generate a grid here
                    const newGrid = generatePuzzleWithSolution(gameSize);

                    // Store game state
                    const gameId = `${newUser.id}-${matchedUser.id}-${Date.now()}`;
                    const newGame: Game = {
                        id: gameId,
                        players: [newUser, matchedUser],
                        size: gameSize,
                        emptyGrid: newGrid.grid.CloneGrid(),
                        grid: newGrid.grid,
                        state: "ongoing"
                    };

                    games[gameId] = newGame;

                    newUser.gameId = gameId;
                    matchedUser.gameId = gameId;

                    io.to(newUser.id).emit("areYouReady");
                    io.to(matchedUser.id).emit("areYouReady");
                }
            }

            socket.on("timerStopped", (data) => {
                const game = Object.values(games).find(g => g.players.some(p => p.id === socket.id) && g.state === "ongoing");
                if (!game) return;
                const gameId = game.id;
                const [newUser, matchedUser] = game.players;

                let user = socket.id === newUser.id ? newUser : matchedUser;
                let otherUser = socket.id === newUser.id ? matchedUser : newUser;

                user.finishedTime = data.elapsed;
                user.completed = data.completed;

                // Once grids are unique solution only
                /* if (user.completed) {
                    // Check grid vs server grid solution here to verify completion
                    for (let cellData of gridState) {
                        const serverCell = grid[cellData.index];
                        if (cellData.value !== serverCell.completedValue) {
                            user.completed = false;
                            break;
                        }
                    }
                } */

                console.log(`Client ${socket.id} stopped timer at ${data.elapsed}ms, completed: ${user.completed}`);

                io.to(otherUser.id).emit("otherPlayerFinished", { finishedTime: data.elapsed });

                if (!game.finishTimeout) {
                    game.finishTimeout = setTimeout(() => {
                        finishGame(gameId);
                    }, 3000);
                    return;
                }

                clearTimeout(game.finishTimeout);
                finishGame(gameId);

            });

            socket.on("readyConfirmation", (data) => {
                const game = Object.values(games).find(g => g.players.some(p => p.id === socket.id) && g.state === "ongoing");
                if (!game) return;
                
                const player = game.players.find(p => p.id === socket.id);
                if (!player) return;

                player.ready = true;
                console.log(`Player ${player.id} is ready for game ${game.id}`);

                if (game.players.every(p => p.ready)) {
                    console.log(`Both players ready for game ${game.id}, starting game.`);
                    for (const player of game.players) {
                        const otherPlayer = game.players.find(p => p.id !== player.id)!;
                        const [newUserWinEloChange, newUserLossEloChange] = calculateEloGainLoss(player, otherPlayer, game.size);
                        player.newEloCalculation = [newUserWinEloChange, newUserLossEloChange];
                        io.to(player.id).emit("playGame", {
                            size: game.size,
                            emptyGrid: game.emptyGrid,
                            grid: game.grid,
                            tempElo: newUserLossEloChange.newElo,
                            newGamesPlayed: newUser.gamesPlayed + 1
                        });

                    console.log("Emitted playGame to ", player.id, " with grid");
                    }
                }
            });

            
            io.to(socket.id).emit("queueJoined");
        });

        socket.on("disconnect", () => {
            console.log("Client disconnected:", socket.id);
            queue = queue.filter(user => user.id !== socket.id);

            for (const gameId in games) {
                const game = games[gameId];
                if (game.players.some(player => player.id === socket.id) && game.state === "ongoing") {
                    game.state = "completed";
                    const otherPlayer = game.players.find(player => player.id !== socket.id)!;
                    const [otherPlayerWinEloChange, otherPlayerLossEloChange] = game.players.find(player => player.id === socket.id)!.newEloCalculation || calculateEloGainLoss(otherPlayer, game.players.find(player => player.id === socket.id)!, game.size);
                    io.to(otherPlayer.id).emit("gameFinished", { won: true, newElo: otherPlayerWinEloChange.newElo, newEloCalculation: otherPlayerWinEloChange, otherForfeit: true });
                    console.log(`Notified ${otherPlayer.id} of win due to opponent disconnect.`);
                    delete games[gameId];
                }
            }
        });

    });

    function finishGame(gameId: string) {
        const game = games[gameId];
        if (!game || game.state !== "ongoing") return;
        game.state = "completed";

        const [player1, player2] = game.players;

        const player1Time = player1.finishedTime ?? Infinity;
        const player2Time = player2.finishedTime ?? Infinity;

        let winner, loser;
        if (player1.completed && player2.completed) {
            winner = player1Time <= player2Time ? player1 : player2;
            loser = winner === player1 ? player2 : player1;
        } else if (player1.completed) {
            winner = player1;
            loser = player2;
        } else if (player2.completed) {
            winner = player2;
            loser = player1;
        } else {
            io.to(player1.id).emit("gameFinished", { won: false, newElo: player1.elo, newEloCalculation: null, otherForfeit: false });
            io.to(player2.id).emit("gameFinished", { won: false, newElo: player2.elo, newEloCalculation: null, otherForfeit: false });
            delete games[gameId];
            return;
        }

        const [winnerEloChange, ] = winner.newEloCalculation || calculateEloGainLoss(winner, loser, game.size);
        const [, loserEloChange] = loser.newEloCalculation || calculateEloGainLoss(loser, winner, game.size);

        io.to(winner.id).emit("gameFinished", { won: true, newElo: winnerEloChange.newElo, newEloCalculation: winnerEloChange, otherForfeit: false });
        io.to(loser.id).emit("gameFinished", { won: false, newElo: loserEloChange.newElo, newEloCalculation: loserEloChange, otherForfeit: false });
        delete games[gameId];
    }

    response.end();
}