/**
 * GameSocket.js
 * A simple wrapper around the browser WebSocket API for the game.
 */
export class GameSocket {
    constructor(url) {
        this.url = url;
        this.ws = null;
        this.clientId = null;
        this.roomCode = null;
        this.onWelcome = null;
        this.onSnapshot = null;
        this.onEvent = null;
        this.onRoomFull = null;
        this.onDisconnect = null;
        this.onDisconnected = null;
        this.isConnected = false;
        this._closedByClient = false;
        this._receivedDisconnect = false;
    }

    connect(room = 'default', username = 'Traveler', character = {}) {
        return new Promise((resolve, reject) => {
            console.log(`Connecting to ${this.url}...`);
            this._closedByClient = false;
            this._receivedDisconnect = false;
            this.ws = new WebSocket(this.url);

            this.ws.onopen = () => {
                this.isConnected = true;
                console.log("WebSocket connected. Joining room:", room);
                this.send({
                    type: 'join',
                    room: room,
                    username: username,
                    character: character
                });
                resolve();
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (e) {
                    console.error("Error parsing WebSocket message:", e);
                }
            };

            this.ws.onclose = () => {
                this.isConnected = false;
                console.log("WebSocket disconnected.");
                if (!this._closedByClient && !this._receivedDisconnect && this.onDisconnect) {
                    this.onDisconnect();
                }
            };

            this.ws.onerror = (err) => {
                console.error("WebSocket error:", err);
                reject(err);
            };
        });
    }

    handleMessage(data) {
        if (!data) return;
        
        switch (data.type) {
            case 'welcome':
                this.clientId = data.id;
                this.roomCode = data.room;
                console.log(`[GameSocket] Welcome received. ClientId: ${this.clientId}, Room: ${this.roomCode}`);
                if (this.onWelcome) this.onWelcome(data);
                break;
            case 'roomFull':
                console.warn("[GameSocket] Room full received");
                if (this.onRoomFull) this.onRoomFull();
                break;
            case 'snapshot':
                if (this.onSnapshot) this.onSnapshot(data);
                break;
            case 'disconnected':
                console.warn("[GameSocket] Disconnected by server:", data.reason);
                this.isConnected = false;
                this._receivedDisconnect = true;
                if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                    this.ws.close();
                }
                if (this.onDisconnected) this.onDisconnected(data);
                break;
            case 'event':
                if (this.onEvent) this.onEvent(data);
                break;
        }
    }

    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
            return true;
        } else if (this.ws && (this.ws.readyState === WebSocket.CLOSING || this.ws.readyState === WebSocket.CLOSED)) {
            this.isConnected = false;
        }
        return false;
    }

    disconnect() {
        if (this.ws) {
            this._closedByClient = true;
            this.isConnected = false;
            this.ws.close();
        }
    }
}
