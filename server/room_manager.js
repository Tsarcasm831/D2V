import { SINGLE_ROOM_CODE } from './constants.js';

export const rooms = new Map();
export const connectionRate = new Map();
export const messageRate = new Map();
export const guilds = new Map();

// Initialize the single room immediately
rooms.set(SINGLE_ROOM_CODE, {
    players: new Map(),
    seed: Math.floor(Math.random() * 1000000)
});

export function getRoom() {
    return rooms.get(SINGLE_ROOM_CODE);
}

export function isRateLimited(map, key, limit) {
    const now = Date.now();
    const entry = map.get(key);
    if (!entry || now > entry.resetAt) {
        map.set(key, { count: 1, resetAt: now + limit.windowMs });
        return false;
    }
    entry.count += 1;
    return entry.count > limit.max;
}

export function broadcastToRoom(roomCode, message, excludeId = null) {
    const room = rooms.get(roomCode);
    if (!room) return;

    const payload = JSON.stringify(message);
    let count = 0;
    room.players.forEach((player, id) => {
        if (id !== excludeId && player.ws.readyState === 1) {
            player.ws.send(payload);
            count++;
        }
    });
    
    if (message.kind === 'playerJoined') {
        console.log(`[${new Date().toISOString()}] Broadcasted playerJoined for ${message.username} to ${count} players in room ${roomCode}`);
    }
}
