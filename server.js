import { WebSocketServer } from 'ws';
import { randomUUID } from 'crypto';
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const TICK_RATE = 20;
const MAX_PLAYERS_PER_ROOM = 2;

// Mime types for static file serving
const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.ico': 'image/x-icon'
};

const server = createServer(async (req, res) => {
    // Parse URL to handle query strings
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;
    
    console.log(`[HTTP] ${req.method} ${pathname}`);

    // Health and Rooms check
    if (pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'OK' }));
        return;
    }

    if (pathname === '/rooms') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        
        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        const roomData = {};
        rooms.forEach((room, roomCode) => {
            roomData[roomCode] = {
                players: room.players.size,
                maxPlayers: MAX_PLAYERS_PER_ROOM
            };
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(roomData));
        return;
    }

    // Static file serving
    let filePath = join(__dirname, pathname === '/' ? 'index.html' : pathname);
    
    // Security: Prevent directory traversal
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    try {
        const content = await readFile(filePath);
        const ext = extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.writeHead(404);
            res.end('File not found');
        } else {
            res.writeHead(500);
            res.end('Internal server error');
        }
    }
});

const wss = new WebSocketServer({ server });

// roomCode -> { players: Map(id -> state), seed: number }
const rooms = new Map();

server.listen(PORT, () => {
    console.log(`WebSocket server started on port ${PORT}`);
});

function getOrCreateRoom(roomCode) {
    if (!rooms.has(roomCode)) {
        rooms.set(roomCode, {
            players: new Map(),
            seed: Math.floor(Math.random() * 1000000)
        });
    }
    return rooms.get(roomCode);
}

wss.on('connection', (ws) => {
    const playerId = randomUUID();
    let currentRoomCode = null;
    let username = "Traveler";

    console.log(`Player ${playerId} connected`);

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            switch (data.type) {
                case 'join':
                    handleJoin(data.room || 'default', data.username, data.character);
                    break;
                case 'input':
                    handleInput(data);
                    break;
                case 'attack':
                    handleAttack();
                    break;
                case 'placeBuilding':
                    handlePlaceBuilding(data);
                    break;
                case 'chat':
                    handleChat(data);
                    break;
            }
        } catch (e) {
            console.error('Error handling message:', e);
        }
    });

    function handleChat(data) {
        if (!currentRoomCode) return;
        broadcastToRoom(currentRoomCode, {
            type: 'event',
            kind: 'chat',
            username: username,
            text: data.text
        }, playerId); // Don't send back to self (sender already added it locally)
    }

    function handleJoin(roomCode, requestedUsername, characterData) {
        const room = getOrCreateRoom(roomCode);
        
        if (room.players.size >= MAX_PLAYERS_PER_ROOM) {
            ws.send(JSON.stringify({ type: 'roomFull' }));
            ws.close();
            return;
        }

        currentRoomCode = roomCode;
        username = requestedUsername || "Traveler";
        
        // Initialize player state
        room.players.set(playerId, {
            id: playerId,
            username: username,
            character: characterData || {},
            pos: [0, 0, 0],
            rot: 0,
            isMoving: false,
            isRunning: false,
            sideMove: 0,
            isDead: false,
            weapon: 'none',
            lastSeen: Date.now(),
            ws: ws // Keep reference to socket for direct messages if needed
        });

        // Send welcome packet
        ws.send(JSON.stringify({
            type: 'welcome',
            id: playerId,
            room: roomCode,
            tickRate: TICK_RATE,
            seed: room.seed
        }));

        console.log(`Player ${username} (${playerId}) joined room: ${roomCode}`);
    }

    function handleInput(data) {
        if (!currentRoomCode) return;
        const room = rooms.get(currentRoomCode);
        if (!room) return;

        const playerState = room.players.get(playerId);
        if (playerState) {
            playerState.pos = data.pos;
            playerState.rot = data.rot;
            playerState.isMoving = data.moving;
            playerState.isRunning = data.running;
            playerState.sideMove = data.sideMove;
            playerState.isDead = data.isDead;
            playerState.weapon = data.weapon;
            playerState.lastSeen = Date.now();
        }
    }

    function handleAttack() {
        if (!currentRoomCode) return;
        broadcastToRoom(currentRoomCode, {
            type: 'event',
            kind: 'attack',
            id: playerId
        }, playerId); // Don't send back to self
    }

    function handlePlaceBuilding(data) {
        if (!currentRoomCode) return;
        // Server-authoritative relay
        broadcastToRoom(currentRoomCode, {
            type: 'event',
            kind: 'buildingPlaced',
            building: {
                buildingId: randomUUID(),
                ownerId: playerId,
                type: data.type,
                x: data.x,
                y: data.y,
                z: data.z,
                rot: data.rot,
                shardX: data.shardX,
                shardZ: data.shardZ
            }
        }); // Broadcast to everyone including sender
    }

    ws.on('close', () => {
        if (currentRoomCode) {
            const room = rooms.get(currentRoomCode);
            if (room) {
                room.players.delete(playerId);
                console.log(`Player ${username} (${playerId}) left room: ${currentRoomCode}`);
                if (room.players.size === 0) {
                    rooms.delete(currentRoomCode);
                    console.log(`Room ${currentRoomCode} deleted (empty)`);
                }
            }
        }
    });
});

function broadcastToRoom(roomCode, message, excludeId = null) {
    const room = rooms.get(roomCode);
    if (!room) return;

    const payload = JSON.stringify(message);
    room.players.forEach((player, id) => {
        if (id !== excludeId && player.ws.readyState === 1) {
            player.ws.send(payload);
        }
    });
}

// Tick loop for snapshots
setInterval(() => {
    const now = Date.now();
    rooms.forEach((room, roomCode) => {
        const playersData = {};
        room.players.forEach((p, id) => {
            // Basic timeout cleanup if needed
            if (now - p.lastSeen > 10000) {
                p.ws.close();
                return;
            }

            playersData[id] = {
                pos: p.pos,
                rot: p.rot,
                isMoving: p.isMoving,
                isRunning: p.isRunning,
                sideMove: p.sideMove,
                isDead: p.isDead,
                weapon: p.weapon,
                username: p.username,
                character: p.character
            };
        });

        const snapshot = JSON.stringify({
            type: 'snapshot',
            t: now,
            players: playersData
        });

        room.players.forEach((p) => {
            if (p.ws.readyState === 1) {
                p.ws.send(snapshot);
            }
        });
    });
}, 1000 / TICK_RATE);
