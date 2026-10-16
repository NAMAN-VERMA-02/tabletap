import { io } from 'socket.io-client';

// Same origin in dev (Vite proxies /socket.io); the API URL in production.
// The auth cookie is sent automatically, which is how staff get into their restaurant's room.
export function connectSocket() {
  return io(import.meta.env.VITE_API_URL || undefined, { withCredentials: true });
}
