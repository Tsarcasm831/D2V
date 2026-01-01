import * as THREE from 'three';
import { GameSocket } from './GameSocket.js';
import { createPlayerMesh } from '../entities/player_mesh.js';
import { PlayerAnimator } from '../entities/player_animator.js';
import { attachUnderwear } from '../items/underwear.js';
import { attachShorts } from '../items/shorts.js';
import { attachShirt } from '../items/shirt.js';
import * as gear from '../items/gear.js';
import { createAxe } from '../items/axe.js';
import { createClub } from '../items/club.js';
import { createPickaxe } from '../items/pickaxe.js';
import { createSword } from '../items/sword.js';
import { Building } from '../systems/buildings.js';
import { SCALE_FACTOR } from '../world/world_bounds.js';

export class NodeMPManager {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        
        // Performance: reuse objects
        this._tempVec = new THREE.Vector3();
        this._tempQuat = new THREE.Quaternion();
        
        // Use wss for production if needed, or ws for local dev
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const host = isLocal ? 'localhost:3001' : window.location.host + '/ws';
        this.socket = new GameSocket(`${protocol}//${host}`);
        
        this.remotePlayers = new Map(); // clientId -> RemotePlayer instance
        this.lastUpdate = 0;
        this.updateInterval = 50; // ms between sending our state (20/s)
    }

    async initialize(characterData = {}, roomCode = 'default') {
        // Setup socket callbacks
        this.socket.onWelcome = (data) => {
            console.log("Joined room:", data.room, "ID:", data.id, "Seed:", data.seed);
            // Optionally set world seed here if game supports it
            if (this.game.worldManager && typeof this.game.worldManager.setSeed === 'function') {
                this.game.worldManager.setSeed(data.seed);
            }
        };

        this.socket.onSnapshot = (data) => {
            this.syncRemotePlayers(data.players);
        };

        this.socket.onEvent = (data) => {
            if (data.kind === 'attack') {
                const remote = this.remotePlayers.get(data.id);
                if (remote) remote.playAttack();
            } else if (data.kind === 'buildingPlaced') {
                this.handleRemoteBuilding(data.building);
            } else if (data.kind === 'chat') {
                if (this.game.chat) {
                    this.game.chat.addMessage(data.username || "Traveler", data.text);
                }
            }
        };

        this.socket.onRoomFull = () => {
            alert("Room is full! (Max 2 players)");
            window.location.reload();
        };

        // Connect
        try {
            const username = characterData.name || localStorage.getItem('username') || 'Traveler';
            
            // Derive host from current window location to ensure we match the serving port (e.g. 3001)
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.host; // This includes the port if present (e.g. localhost:3001)
            this.socket.url = `${protocol}//${host}`;
            
            console.log(`Connecting to server: ${this.socket.url} for room: ${roomCode}`);
            await this.socket.connect(roomCode, username, characterData);
        } catch (e) {
            console.error("Failed to connect to multiplayer server:", e);
            alert("Connection error: Unable to join server.");
            window.location.reload();
        }
    }

    syncRemotePlayers(playersData) {
        const currentIds = new Set(Object.keys(playersData));
        if (this.socket.clientId) {
            currentIds.delete(this.socket.clientId);
        }

        // Remove players who left
        for (const id of this.remotePlayers.keys()) {
            if (!currentIds.has(id)) {
                this.remotePlayers.get(id).destroy();
                this.remotePlayers.delete(id);
            }
        }

        // Add or update players
        for (const id of currentIds) {
            const data = playersData[id];
            if (!data) continue;

            let remote = this.remotePlayers.get(id);
            if (!remote) {
                remote = new RemotePlayer(this.scene, id, data.username || "Traveler", data.character);
                this.remotePlayers.set(id, remote);
            }
            remote.targetState = data;
        }
    }

    update(time, delta) {
        if (!this.socket.isConnected) return;

        // Send own state
        if (time - this.lastUpdate > this.updateInterval) {
            const player = this.game.player;
            if (player && player.mesh) {
                const weaponType = player.inventory.hotbar[player.inventory.selectedSlot]?.type || 'none';
                
                // Calculate sideMove for multiplayer sync
                const velSq = player.playerPhysics.velocity.lengthSq();
                const isMoving = velSq > 0.1;
                const isRunning = velSq > 200;
                let sideMove = 0;
                if (isMoving) {
                    const localVel = this._tempVec.copy(player.playerPhysics.velocity).applyQuaternion(this._tempQuat.copy(player.mesh.quaternion).invert());
                    sideMove = -localVel.x / (isRunning ? player.playerPhysics.runSpeed : player.playerPhysics.walkSpeed);
                }

                this.socket.send({
                    type: 'input',
                    pos: player.mesh.position.toArray(),
                    rot: player.mesh.rotation.y,
                    moving: isMoving,
                    running: isRunning,
                    sideMove: sideMove,
                    isDead: player.isDead,
                    weapon: weaponType
                });
            }
            this.lastUpdate = time;
        }

        // Lerp remote players
        this.remotePlayers.forEach(rp => rp.update(delta));
    }

    broadcastAttack() {
        this.socket.send({
            type: 'attack'
        });
    }

    broadcastChat(text) {
        this.socket.send({
            type: 'chat',
            text: text
        });
    }

    requestPlaceBuilding(type, pos, rot, shardX, shardZ) {
        // Send request to server
        this.socket.send({
            type: 'placeBuilding',
            type,
            x: pos.x,
            y: pos.y,
            z: pos.z,
            rot,
            shardX,
            shardZ
        });
    }

    handleRemoteBuilding(data) {
        // This is called when the server confirms a building placement (for everyone)
        // Skip if this is our own building (already placed via prediction)
        if (data.ownerId === this.socket.clientId) {
            console.log("NodeMPManager: Ignoring remote broadcast of own building placement");
            return;
        }

        const pos = new THREE.Vector3(data.x, data.y, data.z);
        
        // Find the correct shard based on the coordinates
        const shardX = data.shardX;
        const shardZ = data.shardZ;
        const shard = this.game.worldManager.activeShards.get(`${shardX},${shardZ}`);
        
        if (shard) {
            const building = new Building(this.scene, shard, data.type, pos, data.rot);
            
            // Add to shard resources if needed for collision/interaction
            if (shard.resources) {
                shard.resources.push(building);
            }
            
            console.log(`Building ${data.type} placed by ${data.ownerId} in shard ${shardX}, ${shardZ}`);
        } else {
            console.warn(`Could not find shard ${shardX}, ${shardZ} for remote building placement`);
        }
    }
}

class RemotePlayer {
    constructor(scene, id, username, characterData = {}) {
        this.scene = scene;
        this.id = id;
        this.targetState = null;
        
        // Performance: reuse objects
        this._targetPos = new THREE.Vector3();

        const { mesh, parts } = createPlayerMesh({ ...characterData, name: username });
        this.mesh = mesh;
        this.parts = parts;
        this.scene.add(this.mesh);

        // Attach gear
        attachUnderwear(parts);
        attachShorts(parts);
        attachShirt(parts, { ...characterData, name: username });

        // Attach gear if present in characterData
        if (characterData.gear) {
            if (characterData.gear.vest) gear.attachVest(parts);
            if (characterData.gear.leatherArmor) gear.attachLeatherArmor(parts);
            if (characterData.gear.headband) gear.attachHeadband(parts);
            if (characterData.gear.leatherGloves) gear.attachLeatherGloves(parts);
            if (characterData.gear.leatherHuntersCap) gear.attachLeatherHuntersCap(parts);
            if (characterData.gear.assassinsCap) gear.attachAssassinsCap(parts);
            if (characterData.gear.leatherBoots) gear.attachLeatherBoots(parts);
            if (characterData.gear.hood) gear.attachHood(parts);
            if (characterData.gear.cloak) gear.attachCloak(parts);
        }

        this.animator = new PlayerAnimator(parts);

        // Weapons
        this.weapons = {
            axe: createAxe(),
            club: createClub(),
            pickaxe: createPickaxe(),
            sword: createSword()
        };

        this.weaponContainer = new THREE.Group();
        this.weaponContainer.position.set(0, -0.35 * SCALE_FACTOR, 0);
        this.weaponContainer.rotation.x = Math.PI / 2;
        this.parts.rightForeArm.add(this.weaponContainer);

        Object.values(this.weapons).forEach(w => {
            w.visible = false;
            this.weaponContainer.add(w);
        });

        // Username Tag
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0,0,256,64);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(username, 128, 45);
        
        const tex = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: tex });
        this.label = new THREE.Sprite(spriteMat);
        this.label.position.y = 2.5 * SCALE_FACTOR;
        this.label.scale.set(1.5, 0.375, 1);
        this.mesh.add(this.label);
    }

    playAttack() {
        if (!this.animator) return;
        
        // Determine if it's an axe swing or a punch based on visible weapon
        let hasWeapon = false;
        for (const mesh of Object.values(this.weapons)) {
            if (mesh.visible) {
                hasWeapon = true;
                break;
            }
        }
        
        if (hasWeapon) {
            this.animator.playAxeSwing();
        } else {
            this.animator.playPunch();
        }
    }

    update(delta) {
        if (!this.targetState) return;

        const lerpFactor = 0.15;
        this._targetPos.fromArray(this.targetState.pos);
        
        // Only lerp if distance is significant to avoid micro-jitter
        if (this.mesh.position.distanceToSquared(this._targetPos) > 0.0001) {
            this.mesh.position.lerp(this._targetPos, lerpFactor);
        }
        
        // Shortest angle rotation lerp
        let diff = this.targetState.rot - this.mesh.rotation.y;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        
        if (Math.abs(diff) > 0.001) {
            this.mesh.rotation.y += diff * lerpFactor;
        }

        // Sync weapon visibility - only update if changed
        const weaponType = this.targetState.weapon;
        if (this._lastWeapon !== weaponType) {
            for (const [type, mesh] of Object.entries(this.weapons)) {
                mesh.visible = (type === weaponType);
            }
            this._lastWeapon = weaponType;
        }

        // Sync animation - throttling this slightly since animations don't need 60-144Hz sync
        this.animator.animate(
            delta,
            this.targetState.isMoving,
            this.targetState.isRunning,
            this.animator.isPickingUp,
            this.targetState.isDead,
            false, // isJumping (multiplayer simplified)
            'none', // jumpPhase
            0, // jumpTimer
            0, // jumpVelocity
            false, // isLedgeGrabbing
            0, // ledgeGrabTime
            0, // recoverTimer
            false, // isDragged
            'hips', // draggedPartName
            new THREE.Vector3(), // dragVelocity
            0, // deathTime (procedural death handled by state)
            null // deathVariation
        );
    }

    destroy() {
        this.scene.remove(this.mesh);
    }
}