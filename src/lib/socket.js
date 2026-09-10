import { io } from "socket.io-client";

export function createSocket() {
  return io(window.location.origin, {
    transports: ["websocket", "polling"],
    reconnection: true,
  });
}
