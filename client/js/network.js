// High-Performance Dual-Mode Network Manager (Local WebSocket Room Relay + WebRTC P2P Fallback)
class CardNetworkManager {
    constructor(options = {}) {
        this.options = options;
        this.peer = null;
        this.conn = null;
        this.ws = null;
        this.transport = 'none'; // 'ws' | 'p2p'
        this.isHost = false;
        this.roomCode = null;
        this.isConnected = false;
        this.peerOpened = false;
        this.connectTimer = null;

        // Callbacks
        this.onConnected = null;
        this.onDisconnected = null;
        this.onMessage = null;
        this.onError = null;
        this.onRoomCreated = null;
        this.onPacketLog = null; // Packet inspector hook for testing platform
    }

    canUseWebSocket() {
        if (this.options.forceP2P) return false;
        if (this.options.forceWs) return true;
        if (typeof WebSocket === 'undefined') return false;
        if (typeof window !== 'undefined' && window.location && window.location.protocol === 'file:') {
            return false; // Local file mode falls back to PeerJS
        }
        return true;
    }

    getWsUrl() {
        if (this.options.wsUrl) return this.options.wsUrl;
        if (typeof window !== 'undefined' && window.location) {
            const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.host;
            if (host) return `${proto}//${host}/ws`;
        }
        return 'ws://localhost:3000/ws';
    }

    static friendlyError(err, stageLabel) {
        const type = (err && err.type) || '';
        const label = stageLabel ? `${stageLabel}：` : '';
        switch (type) {
            case 'browser-incompatible':
                return `${label}当前浏览器不支持 WebRTC，请换用较新的 Chrome / Edge 浏览器。`;
            case 'invalid-id':
            case 'unavailable-id':
                return `${label}房间号已被占用，正在为你换一个新的房间号…`;
            case 'peer-unavailable':
                return `${label}未找到该房间，请确认 4 位房间号是否正确、房主是否还在大厅。`;
            case 'network':
            case 'server-error':
            case 'socket-error':
            case 'socket-closed':
                return `${label}连不上匹配服务器。可以先玩「本地对决」或「单人切磋」，或检查本地服务器。`;
            case 'webrtc':
                return `${label}点对点通道建立失败，可能是 NAT/防火墙限制。可尝试更换网络后重试。`;
            default:
                return `${label}${(err && err.message) || '网络连接异常'}`;
        }
    }

    watchConnection(stageLabel) {
        clearTimeout(this.connectTimer);
        this.connectTimer = setTimeout(() => {
            if (this.isConnected) return;
            const msg = this.peerOpened
                ? CardNetworkManager.friendlyError({ type: 'peer-unavailable' }, `${stageLabel}（等待对手）`)
                : CardNetworkManager.friendlyError({ type: 'network' }, stageLabel);
            if (this.onError) this.onError(msg);
        }, 12000);
    }

    static generateRoomCode() {
        return Math.floor(1000 + Math.random() * 9000).toString();
    }

    // Create a new room (Host: Player 1)
    createRoom(customCode) {
        this.disconnect();
        this.isHost = true;
        this.peerOpened = false;
        this.roomCode = customCode || CardNetworkManager.generateRoomCode();

        if (this.canUseWebSocket()) {
            this.createRoomViaWs(this.roomCode);
        } else {
            this.createRoomViaP2P(this.roomCode);
        }
    }

    createRoomViaWs(customCode) {
        try {
            const url = this.getWsUrl();
            console.log('[WS] Creating room via WebSocket:', url);
            const ws = new WebSocket(url);
            this.ws = ws;
            this.transport = 'ws';

            ws.onopen = () => {
                ws.send(JSON.stringify({ type: 'CREATE_ROOM', roomCode: customCode }));
            };

            ws.onmessage = (e) => {
                try {
                    const data = JSON.parse(e.data);
                    this.handleWsMessage(data);
                } catch(err) {
                    console.error('[WS Parse Error]', err);
                }
            };

            ws.onerror = (err) => {
                console.warn('[WS Error], falling back to PeerJS P2P...', err);
                if (!this.isConnected && !this.peer) {
                    this.createRoomViaP2P(customCode);
                }
            };

            ws.onclose = () => {
                if (this.transport === 'ws') {
                    this.handleDisconnect();
                }
            };

            this.watchConnection('创建房间 (WebSocket)');
        } catch (err) {
            console.warn('[WS Connect Error], falling back to P2P:', err);
            this.createRoomViaP2P(customCode);
        }
    }

    createRoomViaP2P(customCode) {
        if (typeof Peer === 'undefined') {
            if (this.onError) this.onError('PeerJS 库未加载且无法连接 WebSocket 服务器');
            return;
        }

        this.transport = 'p2p';
        const peerId = `cduel-${this.roomCode}`;
        this.peer = new Peer(peerId, { debug: 1 });

        this.peer.on('open', (id) => {
            clearTimeout(this.connectTimer);
            this.peerOpened = true;
            console.log('[P2P] Room created with Peer ID:', id);
            if (this.onRoomCreated) {
                this.onRoomCreated(this.roomCode);
            }
            this.watchConnection('等待对手接入 (P2P)');
        });

        this.peer.on('connection', (conn) => {
            if (this.conn) {
                conn.close();
                return;
            }
            this.setupP2PConnection(conn);
        });

        this.peer.on('error', (err) => {
            clearTimeout(this.connectTimer);
            console.error('[P2P] Host error:', err);
            if (err.type === 'unavailable-id') {
                this.createRoom();
            } else if (this.onError) {
                this.onError(CardNetworkManager.friendlyError(err, '创建房间'));
            }
        });

        this.watchConnection('创建房间 (P2P)');
    }

    // Join an existing room (Guest: Player 2)
    joinRoom(roomCode) {
        this.disconnect();
        this.isHost = false;
        this.peerOpened = false;
        this.roomCode = String(roomCode || '').trim();

        if (this.canUseWebSocket()) {
            this.joinRoomViaWs(this.roomCode);
        } else {
            this.joinRoomViaP2P(this.roomCode);
        }
    }

    joinRoomViaWs(roomCode) {
        try {
            const url = this.getWsUrl();
            console.log('[WS] Joining room via WebSocket:', url, roomCode);
            const ws = new WebSocket(url);
            this.ws = ws;
            this.transport = 'ws';

            ws.onopen = () => {
                ws.send(JSON.stringify({ type: 'JOIN_ROOM', roomCode }));
            };

            ws.onmessage = (e) => {
                try {
                    const data = JSON.parse(e.data);
                    this.handleWsMessage(data);
                } catch(err) {
                    console.error('[WS Parse Error]', err);
                }
            };

            ws.onerror = (err) => {
                console.warn('[WS Error on join], falling back to PeerJS P2P...', err);
                if (!this.isConnected && !this.peer) {
                    this.joinRoomViaP2P(roomCode);
                }
            };

            ws.onclose = () => {
                if (this.transport === 'ws') {
                    this.handleDisconnect();
                }
            };

            this.watchConnection(`连接房间 ${this.roomCode} (WebSocket)`);
        } catch (err) {
            console.warn('[WS Connect Error on join], falling back to P2P:', err);
            this.joinRoomViaP2P(roomCode);
        }
    }

    joinRoomViaP2P(roomCode) {
        if (typeof Peer === 'undefined') {
            if (this.onError) this.onError('PeerJS 库未加载且无法连接 WebSocket 服务器');
            return;
        }

        this.transport = 'p2p';
        const targetPeerId = `cduel-${this.roomCode}`;
        this.peer = new Peer({ debug: 1 });

        this.peer.on('open', (id) => {
            this.peerOpened = true;
            console.log('[P2P] Client peer opened, connecting to host:', targetPeerId);
            const conn = this.peer.connect(targetPeerId, { reliable: true });
            this.setupP2PConnection(conn);
            this.watchConnection(`连接房间 ${this.roomCode} (P2P)`);
        });

        this.peer.on('error', (err) => {
            clearTimeout(this.connectTimer);
            console.error('[P2P] Client error:', err);
            if (this.onError) {
                this.onError(CardNetworkManager.friendlyError(err, `加入房间 ${this.roomCode}`));
            }
        });

        this.watchConnection('加入房间 (P2P)');
    }

    handleWsMessage(data) {
        if (!data || !data.type) return;

        if (this.onPacketLog) {
            this.onPacketLog({ dir: 'recv', type: data.type, data, timestamp: Date.now() });
        }

        switch (data.type) {
            case 'ROOM_CREATED':
                clearTimeout(this.connectTimer);
                this.roomCode = data.roomCode;
                this.peerOpened = true;
                if (this.onRoomCreated) this.onRoomCreated(this.roomCode);
                this.watchConnection('等待对手接入');
                break;

            case 'ROOM_JOINED':
                clearTimeout(this.connectTimer);
                this.roomCode = data.roomCode;
                this.peerOpened = true;
                break;

            case 'PEER_CONNECTED':
                clearTimeout(this.connectTimer);
                console.log('[WS] Peer connected! isHost:', data.isHost);
                this.isConnected = true;
                if (this.onConnected) this.onConnected(this.isHost);
                break;

            case 'PEER_DISCONNECTED':
                console.log('[WS] Peer disconnected');
                this.handleDisconnect();
                break;

            case 'ERROR':
                clearTimeout(this.connectTimer);
                if (this.onError) this.onError(data.message || '房间连接错误');
                break;

            default:
                // Relay in-game messages
                if (this.onMessage) this.onMessage(data);
                break;
        }
    }

    setupP2PConnection(conn) {
        this.conn = conn;

        this.conn.on('open', () => {
            clearTimeout(this.connectTimer);
            console.log('[P2P] DataChannel connected!');
            this.isConnected = true;
            if (this.onConnected) {
                this.onConnected(this.isHost);
            }
        });

        this.conn.on('data', (data) => {
            console.log('[P2P RECEIVE]', data);
            if (this.onPacketLog) {
                this.onPacketLog({ dir: 'recv', type: data?.type || 'UNKNOWN', data, timestamp: Date.now() });
            }
            if (this.onMessage) {
                this.onMessage(data);
            }
        });

        this.conn.on('close', () => {
            console.log('[P2P] Connection closed');
            this.handleDisconnect();
        });

        this.conn.on('error', (err) => {
            console.error('[P2P] Connection error:', err);
            this.handleDisconnect();
        });
    }

    send(messageObj) {
        if (this.onPacketLog) {
            this.onPacketLog({ dir: 'send', type: messageObj?.type || 'UNKNOWN', data: messageObj, timestamp: Date.now() });
        }

        if (this.transport === 'ws' && this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.log('[WS SEND]', messageObj);
            this.ws.send(JSON.stringify(messageObj));
            return;
        }

        if (this.conn && this.conn.open) {
            console.log('[P2P SEND]', messageObj);
            this.conn.send(messageObj);
            return;
        }

        console.warn('[Network] Cannot send, connection not open:', messageObj);
    }

    handleDisconnect() {
        this.isConnected = false;
        if (this.onDisconnected) {
            this.onDisconnected();
        }
    }

    disconnect() {
        clearTimeout(this.connectTimer);
        this.connectTimer = null;
        this.isConnected = false;
        this.peerOpened = false;

        if (this.ws) {
            try { this.ws.close(); } catch(e) {}
            this.ws = null;
        }
        if (this.conn) {
            try { this.conn.close(); } catch(e) {}
            this.conn = null;
        }
        if (this.peer) {
            try { this.peer.destroy(); } catch(e) {}
            this.peer = null;
        }
        this.transport = 'none';
    }
}

if (typeof window !== 'undefined') {
    window.CardNetworkManager = CardNetworkManager;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CardNetworkManager;
}
