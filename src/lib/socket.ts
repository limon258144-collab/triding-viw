import { io } from 'socket.io-client';

// In development, the socket server is the same as the dev server
// In production, it's the same as the host
const socket = io();

export default socket;
