import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { 
    HOST, 
    PORT, 
    TICK_RATE, 
    INACTIVITY_TIMEOUT_MS, 
    HEARTBEAT_INTERVAL_MS, 
    CLEANUP_DELAY_MS 
} from './server/constants.js';
import { handleHttpRequest } from './server/http_server.js';
import { rooms } from './server/room_manager.js';
import { handleSocketConnection, notifyDisconnect } from './server/socket_handler.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const server = createServer((req, res) => handleHttpRequest(req, res, __dirname));
const wss = new WebSocketServer({ server });

server.listen(PORT, HOST, () => {
    console.log(`WebSocket server started on http://${HOST}:${PORT} [Build: ${new Date().toISOString()}]`);
});

wss.on('connection', (ws, req) => handleSocketConnection(ws, req));

const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((client) => {
        if (client.readyState !== 1) return;
        if (client.isAlive === false) {
            client.terminate();
            return;
        }
        client.isAlive = false;
        client.ping();
    });
}, HEARTBEAT_INTERVAL_MS);

wss.on('close', () => {
    clearInterval(heartbeatInterval);
});

// Tick loop for snapshots
setInterval(() => {
    const now = Date.now();
    rooms.forEach((room, roomCode) => {
        const playersData = {};
        room.players.forEach((p, id) => {
            // Basic timeout cleanup
            if (now - p.lastSeen > INACTIVITY_TIMEOUT_MS) {
                console.log(`[${new Date().toISOString()}] Player ${p.username} (${id}) timed out`);
                notifyDisconnect(p.ws, 'inactivity');
                setTimeout(() => {
                    const currentRoom = rooms.get(roomCode);
                    if (currentRoom) {
                        const currentPlayer = currentRoom.players.get(id);
                        if (currentPlayer && currentPlayer.ws === p.ws) {
                            currentRoom.players.delete(id);
                        }
                    }
                }, CLEANUP_DELAY_MS);
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
