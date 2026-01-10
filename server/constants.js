export const HOST = process.env.HOST || '0.0.0.0';
export const PORT = process.env.PORT || 3001;
export const TICK_RATE = 20;
export const MAX_PLAYERS_PER_ROOM = 4;
export const RATE_LIMITS = {
    connections: { windowMs: 60_000, max: 30 },
    messages: { windowMs: 10_000, max: 300 }
};
export const INACTIVITY_TIMEOUT_MS = Number.parseInt(process.env.INACTIVITY_TIMEOUT_MS, 10) || 15 * 60 * 1000;
export const HEARTBEAT_INTERVAL_MS = Number.parseInt(process.env.HEARTBEAT_INTERVAL_MS, 10) || 30_000;
export const CLEANUP_DELAY_MS = 1000;
export const ESM_ORIGIN = process.env.ESM_ORIGIN || 'https://esm.sh';
export const ESM_REDIRECT_LIMIT = 4;
export const ESM_PROXY_HEADERS = [
    'content-type',
    'cache-control',
    'etag',
    'last-modified',
    'content-encoding',
    'vary',
    'content-length'
];

export const SINGLE_ROOM_CODE = 'Alpha';

export const MIME_TYPES = {
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
