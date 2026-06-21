/**
 * Single shared Socket.IO connection to the backend's /sms namespace, used by
 * both the Dashboard (for live UI) and the foreground service (to stay
 * connected when the app is closed). The backend pushes `sms:jobs` when new
 * messages are queued; the caller drains them.
 */
import { io, Socket } from "socket.io-client";
import { SOCKET_URL, Session } from "./config";

let socket: Socket | null = null;

export function connectSocket(session: Session, onJobs: () => void): Socket {
  if (socket?.connected) return socket;
  if (socket) { try { socket.disconnect(); } catch {} socket = null; }
  socket = io(`${SOCKET_URL}/sms`, {
    path: "/socket.io",
    auth: { token: session.token, subdomain: session.subdomain },
    transports: ["websocket"],
    reconnection: true,
    reconnectionDelay: 2000,
  });
  socket.on("connect", onJobs);
  socket.on("sms:ready", onJobs);
  socket.on("sms:jobs", onJobs);
  return socket;
}

export function getSocket() { return socket; }

export function disconnectSocket() {
  if (socket) { try { socket.disconnect(); } catch {} socket = null; }
}
