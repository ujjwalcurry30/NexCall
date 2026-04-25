const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());

// ─── In-memory room store ─────────────────────────────────────────────────────
// rooms: { roomId: { id, name, createdAt, participants: Map<socketId, { id, name, socketId }> } }
const rooms = new Map();

// ─── REST endpoints ───────────────────────────────────────────────────────────

// Create a new room
app.post("/api/rooms", (req, res) => {
  const { name } = req.body;
  const roomId = uuidv4().slice(0, 8).toUpperCase();
  rooms.set(roomId, {
    id: roomId,
    name: name || `Room ${roomId}`,
    createdAt: new Date().toISOString(),
    participants: new Map(),
  });
  res.json({ roomId, name: rooms.get(roomId).name });
});

// Get room info
app.get("/api/rooms/:roomId", (req, res) => {
  const room = rooms.get(req.params.roomId.toUpperCase());
  if (!room) return res.status(404).json({ error: "Room not found" });
  res.json({
    id: room.id,
    name: room.name,
    createdAt: room.createdAt,
    participantCount: room.participants.size,
    participants: [...room.participants.values()].map((p) => ({
      id: p.id,
      name: p.name,
    })),
  });
});

// List all active rooms (admin/debug)
app.get("/api/rooms", (req, res) => {
  const list = [...rooms.values()].map((r) => ({
    id: r.id,
    name: r.name,
    createdAt: r.createdAt,
    participantCount: r.participants.size,
  }));
  res.json(list);
});

// Health check
app.get("/health", (req, res) => res.json({ status: "ok", rooms: rooms.size }));

// ─── Socket.io signaling ──────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`[connect] ${socket.id}`);

  let currentRoomId = null;
  let currentUser = null;

  // ── Join room ──────────────────────────────────────────────────────────────
  socket.on("join-room", ({ roomId, userName }) => {
    const rid = roomId.toUpperCase();
    let room = rooms.get(rid);

    // Auto-create room if it doesn't exist (join via link)
    if (!room) {
      room = {
        id: rid,
        name: `Room ${rid}`,
        createdAt: new Date().toISOString(),
        participants: new Map(),
      };
      rooms.set(rid, room);
    }

    currentRoomId = rid;
    currentUser = { id: socket.id, name: userName || "Anonymous", socketId: socket.id };
    room.participants.set(socket.id, currentUser);

    socket.join(rid);

    // Send existing participants list to the new joiner
    const others = [...room.participants.values()]
      .filter((p) => p.socketId !== socket.id)
      .map((p) => ({ id: p.socketId, name: p.name }));

    socket.emit("room-joined", {
      roomId: rid,
      roomName: room.name,
      participants: others,
      you: { id: socket.id, name: currentUser.name },
    });

    // Notify others
    socket.to(rid).emit("participant-joined", {
      id: socket.id,
      name: currentUser.name,
    });

    console.log(`[join] ${currentUser.name} → room ${rid} (${room.participants.size} total)`);
  });

  // ── WebRTC signaling ───────────────────────────────────────────────────────
  socket.on("offer", ({ targetId, offer }) => {
    io.to(targetId).emit("offer", {
      offer,
      fromId: socket.id,
      fromName: currentUser?.name || "Unknown",
    });
  });

  socket.on("answer", ({ targetId, answer }) => {
    io.to(targetId).emit("answer", { answer, fromId: socket.id });
  });

  socket.on("ice-candidate", ({ targetId, candidate }) => {
    io.to(targetId).emit("ice-candidate", { candidate, fromId: socket.id });
  });

  // ── Chat ───────────────────────────────────────────────────────────────────
  socket.on("chat-message", ({ roomId, message }) => {
    const rid = roomId.toUpperCase();
    io.to(rid).emit("chat-message", {
      id: uuidv4(),
      senderId: socket.id,
      senderName: currentUser?.name || "Unknown",
      message,
      timestamp: new Date().toISOString(),
    });
  });

  // ── Media state broadcast ──────────────────────────────────────────────────
  socket.on("media-state", ({ roomId, video, audio }) => {
    socket.to(roomId.toUpperCase()).emit("participant-media-state", {
      participantId: socket.id,
      video,
      audio,
    });
  });

  // ── Disconnect ─────────────────────────────────────────────────────────────
  socket.on("disconnect", () => {
    if (currentRoomId) {
      const room = rooms.get(currentRoomId);
      if (room) {
        room.participants.delete(socket.id);
        socket.to(currentRoomId).emit("participant-left", { id: socket.id });
        if (room.participants.size === 0) {
          // Clean up empty rooms after 5 min
          setTimeout(() => {
            if (rooms.get(currentRoomId)?.participants.size === 0) {
              rooms.delete(currentRoomId);
              console.log(`[cleanup] room ${currentRoomId} removed`);
            }
          }, 5 * 60 * 1000);
        }
      }
    }
    console.log(`[disconnect] ${socket.id}`);
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`\n🚀 Signaling server running on http://localhost:${PORT}\n`);
});
