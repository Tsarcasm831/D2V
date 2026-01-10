import { randomUUID } from 'crypto';
import { 
    RATE_LIMITS, 
    SINGLE_ROOM_CODE, 
    MAX_PLAYERS_PER_ROOM, 
    TICK_RATE, 
    CLEANUP_DELAY_MS 
} from './constants.js';
import { 
    rooms, 
    messageRate, 
    connectionRate, 
    guilds, 
    getRoom, 
    isRateLimited, 
    broadcastToRoom 
} from './room_manager.js';

export function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
        return forwarded.split(',')[0].trim();
    }
    return req.socket?.remoteAddress || 'unknown';
}

export function safeSend(ws, message) {
    if (ws.readyState === 1) {
        ws.send(JSON.stringify(message));
        return true;
    }
    return false;
}

export function notifyDisconnect(ws, reason, code = 1000) {
    safeSend(ws, { type: 'disconnected', reason });
    if (ws.readyState === 0 || ws.readyState === 1) {
        ws.close(code, reason);
    }
}

export function handleSocketConnection(ws, req) {
    const clientIp = getClientIp(req);
    if (isRateLimited(connectionRate, clientIp, RATE_LIMITS.connections)) {
        console.warn(`[RateLimit] Connection limit exceeded for ${clientIp}`);
        notifyDisconnect(ws, 'rate_limit', 1008);
        return;
    }

    const playerId = randomUUID();
    const messageRateKey = playerId;
    let currentRoomCode = null;
    let username = "Traveler";

    ws.isAlive = true;
    ws.on('pong', () => {
        ws.isAlive = true;
    });
    ws.on('error', (error) => {
        console.warn(`[WebSocket] Error for ${playerId}: ${error.message}`);
    });

    console.log(`Player ${playerId} connected from ${clientIp}`);

    ws.on('message', (message) => {
        if (isRateLimited(messageRate, messageRateKey, RATE_LIMITS.messages)) {
            console.warn(`[RateLimit] Message limit exceeded for player ${playerId}`);
            notifyDisconnect(ws, 'rate_limit', 1008);
            return;
        }
        try {
            const payload = typeof message === 'string' ? message : message.toString('utf8');
            const data = JSON.parse(payload);
            if (!data || typeof data !== 'object') {
                return;
            }
            if (data.type !== 'input' && Math.random() < 0.1) {
                console.log(`[Message] From ${playerId}: ${data.type}`);
            }

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
                case 'createGuild':
                    handleCreateGuild(data);
                    break;
                case 'joinGuild':
                    handleJoinGuild(data);
                    break;
            }
        } catch (e) {
            console.error('Error handling message:', e);
        }
    });

    function handleCreateGuild(data) {
        if (!currentRoomCode) return;
        const guildId = randomUUID();
        const guild = {
            id: guildId,
            name: data.name || "New Guild",
            leaderId: playerId,
            members: new Set([playerId]),
            basePos: data.basePos || null
        };
        guilds.set(guildId, guild);
        
        const playerState = rooms.get(currentRoomCode).players.get(playerId);
        if (playerState) playerState.guildId = guildId;

        ws.send(JSON.stringify({ type: 'guildCreated', guildId, name: guild.name }));
        broadcastToRoom(currentRoomCode, {
            type: 'event',
            kind: 'chat',
            username: 'System',
            text: `${username} has founded the guild [${guild.name}]!`
        });
    }

    function handleJoinGuild(data) {
        const guild = guilds.get(data.guildId);
        if (guild) {
            guild.members.add(playerId);
            const playerState = rooms.get(currentRoomCode).players.get(playerId);
            if (playerState) playerState.guildId = data.guildId;
            ws.send(JSON.stringify({ type: 'guildJoined', guildId: data.guildId, name: guild.name }));
        }
    }

    function markPlayerSeen() {
        if (!currentRoomCode) return;
        const room = rooms.get(currentRoomCode);
        if (!room) return;
        const playerState = room.players.get(playerId);
        if (playerState) {
            playerState.lastSeen = Date.now();
        }
    }

    function handleChat(data) {
        if (!currentRoomCode) return;
        markPlayerSeen();
        const text = typeof data.text === 'string' ? data.text : '';
        broadcastToRoom(currentRoomCode, {
            type: 'event',
            kind: 'chat',
            username: username,
            text: text
        }, playerId);
    }

    function handleJoin(roomCode, requestedUsername, characterData) {
        currentRoomCode = null; 
        const room = getRoom();
        const normalizedRoomCode = SINGLE_ROOM_CODE;
        
        if (room.players.size >= MAX_PLAYERS_PER_ROOM) {
            console.log(`[${new Date().toISOString()}] Room ${normalizedRoomCode} is full. Rejecting ${playerId}`);
            ws.send(JSON.stringify({ type: 'roomFull' }));
            return;
        }

        currentRoomCode = normalizedRoomCode;
        username = requestedUsername || "Traveler";
        
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
            ws: ws
        });

        ws.send(JSON.stringify({
            type: 'welcome',
            id: playerId,
            room: normalizedRoomCode,
            tickRate: TICK_RATE,
            seed: room.seed
        }));

        console.log(`[${new Date().toISOString()}] Player ${username} (${playerId}) joined room: ${normalizedRoomCode}. Total players: ${room.players.size}`);

        broadcastToRoom(normalizedRoomCode, {
            type: 'event',
            kind: 'playerJoined',
            username: username,
            id: playerId
        }, playerId);

        ws.send(JSON.stringify({
            type: 'event',
            kind: 'chat',
            username: 'System',
            text: `Welcome to the realm, ${username}!`
        }));
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
            markPlayerSeen();
        }
    }

    function handleAttack() {
        if (!currentRoomCode) return;
        markPlayerSeen();
        broadcastToRoom(currentRoomCode, {
            type: 'event',
            kind: 'attack',
            id: playerId
        }, playerId);
    }

    function handlePlaceBuilding(data) {
        if (!currentRoomCode) return;
        markPlayerSeen();
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
        });
    }

    ws.on('close', (code, reason) => {
        const timestamp = new Date().toISOString();
        const reasonText = reason ? reason.toString() : 'unknown';
        console.log(`[${timestamp}] Socket closed for player ${playerId} (${username}) code=${code} reason=${reasonText}`);
        messageRate.delete(messageRateKey);
        
        setTimeout(() => {
            if (currentRoomCode) {
                const room = rooms.get(currentRoomCode);
                if (room) {
                    const player = room.players.get(playerId);
                    if (player && player.ws === ws) {
                        room.players.delete(playerId);
                        console.log(`[${timestamp}] Player ${username} (${playerId}) officially left room: ${currentRoomCode}. Remaining: ${room.players.size}`);
                    } else {
                        console.log(`[${timestamp}] Close event for ${username} (${playerId}) ignored: newer socket is active.`);
                    }
                }
            }
        }, CLEANUP_DELAY_MS);
    });
}
