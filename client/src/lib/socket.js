import { io } from 'socket.io-client';
import api from './api';

// Dev: same origin (Vite proxies /socket.io). Production: straight to the API server,
// because the frontend host can't proxy websockets.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || undefined;

/**
 * Staff sockets fetch a short-lived token before every (re)connect so the server can put
 * them in their restaurant's room. Diner sockets connect anonymously.
 */
export function connectSocket({ staff = false } = {}) {
  return io(SOCKET_URL, {
    withCredentials: true,
    ...(staff && {
      auth: (cb) =>
        api
          .get('/auth/socket-token')
          .then(({ data }) => cb({ token: data.token }))
          .catch(() => cb({})),
    }),
  });
}
