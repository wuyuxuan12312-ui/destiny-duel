// Destiny Duel - Zero-Dependency WebSocket Room Relay Server (RFC 6455)
const crypto = require('node:crypto');

const WS_MAGIC_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

function parseFrame(buffer) {
    if (buffer.length < 2) return null;
    const firstByte = buffer[0];
    const opcode = firstByte & 0x0F;
    const fin = Boolean(firstByte & 0x80);

    const secondByte = buffer[1];
    const isMasked = Boolean(secondByte & 0x80);
    let payloadLength = secondByte & 0x7F;
    let offset = 2;

    if (payloadLength === 126) {
        if (buffer.length < 4) return null;
        payloadLength = buffer.readUInt16BE(2);
        offset = 4;
    } else if (payloadLength === 127) {
        if (buffer.length < 10) return null;
        payloadLength = Number(buffer.readBigUInt64BE(2));
        offset = 10;
    }

    if (isMasked) {
        if (buffer.length < offset + 4 + payloadLength) return null;
        const mask = buffer.subarray(offset, offset + 4);
        offset += 4;
        const payload = buffer.subarray(offset, offset + payloadLength);
        const data = Buffer.alloc(payloadLength);
        for (let i = 0; i < payloadLength; i++) {
            data[i] = payload[i] ^ mask[i % 4];
        }
        return { opcode, fin, data: data.toString('utf8'), totalLength: offset + payloadLength };
    }

    if (buffer.length < offset + payloadLength) return null;
    return {
        opcode,
        fin,
        data: buffer.subarray(offset, offset + payloadLength).toString('utf8'),
        totalLength: offset + payloadLength
    };
}

function createTextFrame(text) {
    const payload = Buffer.from(text, 'utf8');
    const length = payload.length;
    let header;
    if (length <= 125) {
        header = Buffer.alloc(2);
        header[0] = 0x81; // FIN + text opcode
        header[1] = length;
    } else if (length <= 65535) {
        header = Buffer.alloc(4);
        header[0] = 0x81;
        header[1] = 126;
        header.writeUInt16BE(length, 2);
    } else {
        header = Buffer.alloc(10);
        header[0] = 0x81;
        header[1] = 127;
        header.writeBigUInt64BE(BigInt(length), 2);
    }
    return Buffer.concat([header, payload]);
}

function createCloseFrame() {
    return Buffer.from([0x88, 0x00]);
}

function createPongFrame() {
    return Buffer.from([0x8A, 0x00]);
}

class RoomManager {
    constructor() {
        this.rooms = new Map(); // roomCode -> { host, guest, createdAt }
    }

    generateCode() {
        let code;
        let attempts = 0;
        do {
            code = Math.floor(1000 + Math.random() * 9000).toString();
        } while (this.rooms.has(code) && attempts++ < 100);
        return code;
    }

    createRoom(socket, customCode) {
        const code = customCode || this.generateCode();
        if (this.rooms.has(code)) {
            const existing = this.rooms.get(code);
            if (existing && existing.host && existing.host !== socket) {
                if (existing.host.destroyed || existing.host.readyState === 'closed') {
                    this.rooms.delete(code);
                }
            }
        }

        const room = {
            code,
            host: socket,
            guest: null,
            createdAt: Date.now()
        };
        this.rooms.set(code, room);
        socket._roomCode = code;
        socket._isHost = true;

        socket.sendJson({
            type: 'ROOM_CREATED',
            roomCode: code,
            isHost: true
        });
        console.log(`[WS-Room] Room ${code} created by Host`);
        return room;
    }

    joinRoom(socket, code) {
        const room = this.rooms.get(code);
        if (!room) {
            socket.sendJson({
                type: 'ERROR',
                message: `未找到房间「${code}」，请确认 4 位房间号是否正确。`
            });
            return false;
        }

        if (room.guest && room.guest !== socket && !room.guest.destroyed) {
            socket.sendJson({
                type: 'ERROR',
                message: `房间「${code}」已有其他玩家接入。`
            });
            return false;
        }

        room.guest = socket;
        socket._roomCode = code;
        socket._isHost = false;

        console.log(`[WS-Room] Guest joined room ${code}`);

        // Notify both peers that they are now connected!
        socket.sendJson({
            type: 'ROOM_JOINED',
            roomCode: code,
            isHost: false
        });

        if (room.host && !room.host.destroyed) {
            room.host.sendJson({
                type: 'PEER_CONNECTED',
                isHost: true,
                roomCode: code
            });
        }

        socket.sendJson({
            type: 'PEER_CONNECTED',
            isHost: false,
            roomCode: code
        });

        return true;
    }

    relay(socket, messageObj) {
        const code = socket._roomCode;
        if (!code) return;
        const room = this.rooms.get(code);
        if (!room) return;

        const target = socket._isHost ? room.guest : room.host;
        if (target && !target.destroyed) {
            target.sendJson(messageObj);
        }
    }

    handleDisconnect(socket) {
        const code = socket._roomCode;
        if (!code) return;
        const room = this.rooms.get(code);
        if (!room) return;

        console.log(`[WS-Room] Client disconnected from room ${code} (was host: ${socket._isHost})`);
        const peer = socket._isHost ? room.guest : room.host;
        if (peer && !peer.destroyed) {
            peer.sendJson({
                type: 'PEER_DISCONNECTED',
                roomCode: code
            });
        }

        if (socket._isHost) {
            this.rooms.delete(code);
        } else {
            room.guest = null;
        }
    }
}

function attachWebSocketServer(server) {
    const roomManager = new RoomManager();

    server.on('upgrade', (req, socket, head) => {
        const pathname = req.url.split('?')[0];
        if (pathname !== '/ws' && pathname !== '/signal' && pathname !== '/') {
            return;
        }

        const key = req.headers['sec-websocket-key'];
        if (!key) {
            socket.destroy();
            return;
        }

        const digest = crypto.createHash('sha1')
            .update(key + WS_MAGIC_GUID)
            .digest('base64');

        socket.write(
            'HTTP/1.1 101 Switching Protocols\r\n' +
            'Upgrade: websocket\r\n' +
            'Connection: Upgrade\r\n' +
            'Sec-WebSocket-Accept: ' + digest + '\r\n\r\n'
        );

        socket.sendJson = function(obj) {
            if (socket.destroyed) return;
            try {
                const text = JSON.stringify(obj);
                socket.write(createTextFrame(text));
            } catch (err) {
                console.error('[WS-Send Error]', err);
            }
        };

        let buffer = Buffer.alloc(0);

        socket.on('data', chunk => {
            buffer = Buffer.concat([buffer, chunk]);
            while (buffer.length > 0) {
                const frame = parseFrame(buffer);
                if (!frame) break;
                buffer = buffer.subarray(frame.totalLength);

                if (frame.opcode === 0x08) {
                    socket.write(createCloseFrame());
                    socket.destroy();
                    break;
                } else if (frame.opcode === 0x09) {
                    socket.write(createPongFrame());
                } else if (frame.opcode === 0x01) {
                    try {
                        const msg = JSON.parse(frame.data);
                        handleSocketMessage(socket, msg, roomManager);
                    } catch (parseErr) {
                        console.error('[WS Frame Parse Error]', parseErr, frame.data);
                    }
                }
            }
        });

        socket.on('close', () => {
            roomManager.handleDisconnect(socket);
        });

        socket.on('error', (err) => {
            console.warn('[WS Socket Error]', err.message);
            roomManager.handleDisconnect(socket);
        });
    });

    return roomManager;
}

function handleSocketMessage(socket, msg, roomManager) {
    if (!msg || !msg.type) return;

    switch (msg.type) {
        case 'CREATE_ROOM':
            roomManager.createRoom(socket, msg.roomCode);
            break;

        case 'JOIN_ROOM':
            roomManager.joinRoom(socket, String(msg.roomCode || '').trim());
            break;

        case 'PING':
            socket.sendJson({ type: 'PONG', timestamp: Date.now() });
            break;

        default:
            roomManager.relay(socket, msg);
            break;
    }
}

module.exports = {
    attachWebSocketServer,
    RoomManager,
    parseFrame,
    createTextFrame
};
