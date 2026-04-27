"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocket = initSocket;
exports.getIo = getIo;
const socket_io_1 = require("socket.io");
let io = null;
function initSocket(server) {
    io = new socket_io_1.Server(server, {
        cors: { origin: '*', methods: ['GET', 'POST'] }
    });
    io.on('connection', (socket) => {
        socket.on('subscribe', (payload = {}) => {
            if (payload.deviceId)
                socket.join(`device:${payload.deviceId}`);
        });
    });
    return io;
}
function getIo() {
    if (!io)
        throw new Error('Socket.IO not initialized');
    return io;
}
