import { io } from "socket.io-client";

let socket = null;

export function connectSocket() {
  if (socket && socket.connected) return socket;
  socket = io("/", {
    transports: ["websocket", "polling"],
  });
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (!socket) return;
  socket.disconnect();
  socket = null;
}

