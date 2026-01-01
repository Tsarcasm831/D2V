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
        this.isConnected = false;
    }

    connect(room = 'default', username = 'Traveler', character = {}) {
        return new Promise((resolve, reject) => {
            console.log(`Connecting to ${this.url}...`);
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
            };

            this.ws.onerror = (err) => {
                console.error("WebSocket error:", err);
                reject(err);
            };
        });
    }

    handleMessage(data) {
        switch (data.type) {
            case 'welcome':
                this.clientId = data.id;
                this.roomCode = data.room;
                if (this.onWelcome) this.onWelcome(data);
                break;
            case 'roomFull':
                if (this.onRoomFull) this.onRoomFull();
                break;
            case 'snapshot':
                if (this.onSnapshot) this.onSnapshot(data);
                break;
            case 'event':
                if (this.onEvent) this.onEvent(data);
                break;
        }
    }

    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
    }
}
