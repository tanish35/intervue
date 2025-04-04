import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import "dotenv/config";
import { createServer } from "http";
import { Server, Socket } from "socket.io";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

const FRONTEND_URI = process.env.FRONTEND_URI || "http:
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: [
      "http:
      "http:
      `${FRONTEND_URI}`,
    ],
    credentials: true,
  })
);

import pollRouter from "./routes/poll.routes";
app.use("/api/poll", pollRouter);

import userRouter from "./routes/user.routes";
app.use("/api/user", userRouter);

io.on("connection", (socket: Socket) => {
  console.log(`✅ Client connected: ${socket.id}`);

  socket.on("message", (message) => {
    console.log("Message received:", message);
    socket.emit("message", `Message received: ${message}`);
  });

  socket.on("join-poll", (code: string, userId: string) => {
    socket.join(code);
    console.log(`🚪 Client ${socket.id} joined room: ${code}`);
  });

  socket.on("disconnect", () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

export { io };

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
