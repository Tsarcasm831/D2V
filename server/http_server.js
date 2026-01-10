import { readFile } from 'fs/promises';
import { join, extname } from 'path';
import { 
    MIME_TYPES, 
    MAX_PLAYERS_PER_ROOM 
} from './constants.js';
import { 
    shouldProxyEsmPath, 
    buildUpstreamUrl, 
    proxyEsmModule 
} from './proxy.js';
import { rooms } from './room_manager.js';

export async function handleHttpRequest(req, res, dirname) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;
    
    console.log(`[HTTP] ${req.method} ${pathname}`);

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

    if (shouldProxyEsmPath(pathname)) {
        const upstreamPath = pathname.startsWith('/esm/')
            ? pathname.slice('/esm/'.length)
            : pathname.replace(/^\/+/, '');
        if (!upstreamPath) {
            res.writeHead(400);
            res.end('Missing ESM module path');
            return;
        }
        const upstreamUrl = buildUpstreamUrl(pathname, url.search);
        proxyEsmModule(res, upstreamUrl);
        return;
    }

    let filePath = join(dirname, pathname === '/' ? 'index.html' : pathname);
    
    if (!filePath.startsWith(dirname)) {
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
}
