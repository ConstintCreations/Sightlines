import { Server } from "socket.io";

export default function SocketHandler(request: any, response: any) {
    if (response.socket.server.io) {
        response.end();
        return;
    }

    const io = new Server(response.socket.server);
    response.socket.server.io = io;

    io.on("connection", (socket) => {
        console.log("New client connected:", socket.id);

        socket.on("joinQueue", (data) => {
            console.log(`Client ${socket.id} joined queue for size ${data.size}`);
            io.to(socket.id).emit("queueJoined");
        });
    });

    response.end();
}