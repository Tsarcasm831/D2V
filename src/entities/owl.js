import * as THREE from 'three';
import { SCALE_FACTOR } from '../world/world_bounds.js';

export class Owl {
    constructor(scene, shard, pos) {
        this.scene = scene;
        this.shard = shard;

        // Owls are typically fauna/neutral. Flip to true if you want them hostile.
        this.isEnemy = false;
        this.isDead = false;
        this.type = 'owl';

        this.group = new THREE.Group();
        this.group.position.copy(pos);
        this.scene.add(this.group);

        const dist = pos.length();
        this.level = Math.floor(Math.min(100, 1 + (dist / 120)));

        // Summoned/Following state
        this.isSummoned = false;
        this.owner = null;
        this.followDistance = 5 * SCALE_FACTOR;

        this.setupMesh();

        // Movement/AI
        this.velocity = new THREE.Vector3();
        this.wanderAngle = Math.random() * Math.PI * 2;
        this.timer = Math.random() * 2;

        // perch, hop, fly, flee
        this.state = 'perch';

        this.moveSpeed = 3.2 * SCALE_FACTOR;
        this.flySpeed = 6.5 * SCALE_FACTOR;

        // Flight params
        this.flyCenter = pos.clone();
        this.flyAngle = Math.random() * Math.PI * 2;
        this.flyRadius = (3 + Math.random() * 5) * SCALE_FACTOR;
        this.flyHeight = (2.8 + Math.random() * 2.0) * SCALE_FACTOR;
        this.heightLerp = 0;

        // Health (small critter)
        this.maxHealth = 2 + Math.floor(this.level / 15);
        this.health = this.maxHealth;

        // Performance: reuse objects
        this._tempVec1 = new THREE.Vector3();
        this._tempVec2 = new THREE.Vector3();
        this._collisionTimer = 0;
        this._aiTimer = 0;
    }

    setupMesh() {
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x4a3b2a }); // brown
        const featherMat = new THREE.MeshStandardMaterial({ color: 0x6b5a45 }); // lighter
        const beakMat = new THREE.MeshStandardMaterial({ color: 0xd6a13a });
        const eyeMat = new THREE.MeshStandardMaterial({
            color: 0xffd34d,
            emissive: 0xffd34d,
            emissiveIntensity: 1.2
        });

        // Body
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(0.45, 0.55, 0.45).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR),
            bodyMat
        );
        body.position.y = 0.55 * SCALE_FACTOR;
        body.castShadow = true;
        this.group.add(body);

        // Belly/feather front
        const belly = new THREE.Mesh(
            new THREE.BoxGeometry(0.38, 0.45, 0.25).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR),
            featherMat
        );
        belly.position.set(0, 0.5 * SCALE_FACTOR, 0.15 * SCALE_FACTOR);
        this.group.add(belly);

        // Head group
        const headGroup = new THREE.Group();
        headGroup.position.set(0, 0.95 * SCALE_FACTOR, 0.15 * SCALE_FACTOR);
        this.group.add(headGroup);
        this.headGroup = headGroup;

        const head = new THREE.Mesh(
            new THREE.BoxGeometry(0.42, 0.42, 0.38).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR),
            featherMat
        );
        head.castShadow = true;
        headGroup.add(head);

        // Beak
        const beak = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.10, 0.20).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR),
            beakMat
        );
        beak.position.set(0, -0.06 * SCALE_FACTOR, 0.28 * SCALE_FACTOR);
        headGroup.add(beak);

        // Eyes
        const eyeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR);
        const lEye = new THREE.Mesh(eyeGeo, eyeMat);
        lEye.position.set(0.14 * SCALE_FACTOR, 0.06 * SCALE_FACTOR, 0.18 * SCALE_FACTOR);
        headGroup.add(lEye);

        const rEye = new THREE.Mesh(eyeGeo, eyeMat);
        rEye.position.set(-0.14 * SCALE_FACTOR, 0.06 * SCALE_FACTOR, 0.18 * SCALE_FACTOR);
        headGroup.add(rEye);

        // Ear tufts (owl "horns")
        const tuftGeo = new THREE.BoxGeometry(0.08, 0.18, 0.08).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR);
        const lTuft = new THREE.Mesh(tuftGeo, bodyMat);
        lTuft.position.set(0.16 * SCALE_FACTOR, 0.24 * SCALE_FACTOR, -0.02 * SCALE_FACTOR);
        headGroup.add(lTuft);

        const rTuft = new THREE.Mesh(tuftGeo, bodyMat);
        rTuft.position.set(-0.16 * SCALE_FACTOR, 0.24 * SCALE_FACTOR, -0.02 * SCALE_FACTOR);
        headGroup.add(rTuft);

        // Wings (as groups so we can flap)
        this.leftWing = new THREE.Group();
        this.rightWing = new THREE.Group();

        this.leftWing.position.set(0.32 * SCALE_FACTOR, 0.65 * SCALE_FACTOR, 0.0);
        this.rightWing.position.set(-0.32 * SCALE_FACTOR, 0.65 * SCALE_FACTOR, 0.0);

        this.group.add(this.leftWing);
        this.group.add(this.rightWing);

        const wingGeo = new THREE.BoxGeometry(0.12, 0.45, 0.70).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR);

        const lWingMesh = new THREE.Mesh(wingGeo, bodyMat);
        lWingMesh.position.set(0.08 * SCALE_FACTOR, 0, -0.05 * SCALE_FACTOR);
        lWingMesh.castShadow = true;
        this.leftWing.add(lWingMesh);

        const rWingMesh = new THREE.Mesh(wingGeo, bodyMat);
        rWingMesh.position.set(-0.08 * SCALE_FACTOR, 0, -0.05 * SCALE_FACTOR);
        rWingMesh.castShadow = true;
        this.rightWing.add(rWingMesh);

        // Feet (tiny)
        const footGeo = new THREE.BoxGeometry(0.10, 0.18, 0.10).scale(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR);
        this.feet = [];
        const footPositions = [
            { x: 0.12, z: 0.05 },
            { x: -0.12, z: 0.05 }
        ];
        footPositions.forEach(p => {
            const foot = new THREE.Mesh(footGeo, beakMat);
            foot.position.set(p.x * SCALE_FACTOR, 0.12 * SCALE_FACTOR, p.z * SCALE_FACTOR);
            foot.castShadow = true;
            this.group.add(foot);
            this.feet.push(foot);
        });

        // For compatibility with targeting/collision
        this.mesh = body;

        // Label (optional)
        this.addLevelLabel();
    }

    addLevelLabel() {
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 64;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, 256, 64);

        ctx.fillStyle = '#ffd34d';
        ctx.font = 'bold 30px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`Lv. ${this.level} OWL`, 128, 32);

        const tex = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: tex });
        this.label = new THREE.Sprite(spriteMat);
        this.label.position.y = 1.6 * SCALE_FACTOR;
        this.label.scale.set(2.0, 0.5, 1);
        this.group.add(this.label);
    }

    takeDamage(amount, fromPos, player) {
        if (this.isDead) return;

        this.health -= amount;

        // Visual feedback jolt
        const originalScale = this.group.scale.clone();
        this.group.scale.multiplyScalar(1.15);
        setTimeout(() => {
            if (this.group && !this.isDead) this.group.scale.copy(originalScale);
        }, 50);

        // If hit, force flee (if alive)
        if (this.health > 0) {
            this.state = 'flee';
            this.timer = 1.4 + Math.random() * 0.8;

            // Kick flight params away from attacker
            if (fromPos) {
                const away = this._tempVec1.subVectors(this.group.position, fromPos).normalize();
                this.flyCenter.copy(this.group.position).addScaledVector(away, 6 * SCALE_FACTOR);
            } else {
                this.flyCenter.copy(this.group.position);
            }
            this.flyRadius = (4 + Math.random() * 6) * SCALE_FACTOR;

            import('../utils/audio_manager.js').then(({ audioManager }) => {
                audioManager.play('enemy_hit', 0.25);
                if (Math.random() > 0.6) audioManager.play('owl_hoot', 0.25);
            });

            return;
        }

        this.die(fromPos, player);
    }

    die(fromPos, player) {
        if (this.isDead) return;
        this.isDead = true;

        // Knockback
        const dir = this._tempVec1.subVectors(this.group.position, fromPos || this.group.position).normalize();
        this.velocity.set(dir.x * 10, 10, dir.z * 10);

        import('../utils/audio_manager.js').then(({ audioManager }) => {
            audioManager.play('enemy_hit', 0.35);
            if (Math.random() > 0.5) audioManager.play('owl_hoot', 0.25);
        });

        // Loot drops
        if (player && player.inventory) {
            const featherCount = Math.floor(Math.random() * 6) + 2;
            const meatCount = Math.floor(Math.random() * 2) + 1;

            player.inventory.addItem({
                type: 'feather',
                name: 'Owl Feather',
                icon: 'assets/icons/feather_icon.png',
                count: featherCount,
                stackLimit: 99
            });

            player.inventory.addItem({
                type: 'meat',
                name: 'Raw Meat',
                icon: 'assets/icons/meat_icon.png',
                count: meatCount,
                stackLimit: 99
            });
        }
    }

    checkCollisions(player) {
        if (!this.shard || this.isDead) return;

        // If flying, skip most ground collisions for performance + behavior
        const floorY = this.shard.getTerrainHeight(this.group.position.x, this.group.position.z);
        const isFlying = this.group.position.y > floorY + 0.4 * SCALE_FACTOR;
        if (isFlying) return;

        const myPos = this.group.position;

        // Skip if player far
        if (player && player.mesh) {
            const distSqToPlayer = myPos.distanceToSquared(player.mesh.position);
            if (distSqToPlayer > 2500) return; // > 50m
        }

        const myRadius = 0.45 * SCALE_FACTOR;
        const resources = this.shard.resources;

        // Obstacles (Resources/Buildings)
        for (let i = 0; i < resources.length; i++) {
            const res = resources[i];
            if (res.isDead || !res.group) continue;

            const resPos = res.group.position;
            const dx = myPos.x - resPos.x;
            const dz = myPos.z - resPos.z;
            const distSq = dx * dx + dz * dz;

            if (distSq > 81) continue; // 9m check

            let resRadius = (res.radius || (res.type === 'tree' ? 0.5 : 1.2)) * SCALE_FACTOR;
            if (res.type === 'pond' && res.getCollisionRadiusAtAngle) {
                resRadius = res.getCollisionRadiusAtAngle(Math.atan2(dz, dx));
            }

            const minDist = myRadius + resRadius;

            if (distSq < minDist * minDist) {
                const dist = Math.sqrt(distSq);
                if (dist < 0.01) continue;
                const overlap = (minDist - dist);
                myPos.x += (dx / dist) * overlap;
                myPos.z += (dz / dz) * overlap;
            }
        }

        // Other fauna
        const fauna = this.shard.fauna;
        for (let i = 0; i < fauna.length; i++) {
            const other = fauna[i];
            if (other === this || other.isDead) continue;

            const otherPos = (other.group || other.mesh).position;
            const dx = myPos.x - otherPos.x;
            const dz = myPos.z - otherPos.z;
            const distSq = dx * dx + dz * dz;
            if (distSq > 16) continue; // 4m

            const otherRadius =
                (other.type === 'bear' ? 1.0 : other.type === 'wolf' ? 0.6 : other.type === 'owl' ? 0.45 : 0.5) * SCALE_FACTOR;

            const minDist = myRadius + otherRadius;

            if (distSq < minDist * minDist) {
                const dist = Math.sqrt(distSq);
                if (dist < 0.01) continue;
                const overlap = (minDist - dist) * 0.5;
                myPos.x += (dx / dist) * overlap;
                myPos.z += (dz / dist) * overlap;
            }
        }

        // Player push-out (gentle)
        if (player && player.mesh) {
            const pPos = player.mesh.position;
            const dx = myPos.x - pPos.x;
            const dz = myPos.z - pPos.z;
            const distSq = dx * dx + dz * dz;

            if (distSq < 16) {
                const pRadius = 0.5 * SCALE_FACTOR;
                const minDist = myRadius + pRadius;

                if (distSq < minDist * minDist) {
                    const dist = Math.sqrt(distSq);
                    if (dist < 0.01) return;
                    const overlap = (minDist - dist) * 0.5;
                    myPos.x += (dx / dist) * overlap;
                    myPos.z += (dz / dist) * overlap;
                }
            }
        }
    }

    update(delta, player) {
        if (this.isDead) {
            const floorY = this.shard.getTerrainHeight(this.group.position.x, this.group.position.z);
            if (this.group.position.y > floorY || this.velocity.y > 0) {
                this.group.position.addScaledVector(this.velocity, delta);
                this.velocity.y -= 32 * delta;

                // tumble
                this.group.rotation.x += 7 * delta;
                this.group.rotation.z += 4 * delta;

                if (this.group.position.y < floorY) {
                    this.group.position.y = floorY;
                    this.velocity.set(0, 0, 0);
                    this.group.rotation.x = Math.PI / 2;
                }
            }
            return;
        }

        this._aiTimer -= delta;
        if (this._aiTimer <= 0) {
            this._aiTimer = 0.05; // 20Hz AI
            this.updateAI(player);
        }

        this.updateMovement(delta, player);

        const t = performance.now() * 0.01;
        this.updateAnimations(t, delta);

        // Height handling
        const floorY = this.shard.getTerrainHeight(this.group.position.x, this.group.position.z);

        // If flying, hover above ground; otherwise snap to ground
        const wantsFlight = (this.state === 'fly' || this.state === 'flee');
        const targetY = wantsFlight ? (floorY + this.flyHeight) : floorY;

        // Smooth lerp Y so takeoff/landing feel nice
        this.group.position.y = THREE.MathUtils.lerp(this.group.position.y, targetY, 6 * delta);

        this._collisionTimer -= delta;
        if (this._collisionTimer <= 0) {
            this._collisionTimer = 0.05; // 20Hz collision
            this.checkCollisions(player);
        }
    }

    updateAI(player) {
        if (this.isSummoned && this.owner) {
            const distToOwner = this.group.position.distanceTo(this.owner.mesh.position);
            
            if (distToOwner > this.followDistance * 3) {
                this.state = 'fly';
            } else if (distToOwner > this.followDistance) {
                this.state = 'hop';
            } else {
                this.state = 'perch';
            }
            return;
        }

        const canReact = !!(player && player.mesh && !player.isInvulnerable);
        const distToPlayer = canReact ? this.group.position.distanceTo(player.mesh.position) : 999;

        const scareRange = 10 * SCALE_FACTOR;
        const calmRange = 14 * SCALE_FACTOR;

        // Flee when player is close
        if (canReact && distToPlayer < scareRange) {
            if (this.state !== 'flee') {
                this.state = 'flee';
                this.timer = 1.4 + Math.random() * 0.8;

                const away = this._tempVec1.subVectors(this.group.position, player.mesh.position).normalize();
                this.flyCenter.copy(this.group.position).addScaledVector(away, 7 * SCALE_FACTOR);

                // Randomize orbit
                this.flyRadius = (5 + Math.random() * 7) * SCALE_FACTOR;
                this.flyHeight = (3.2 + Math.random() * 2.0) * SCALE_FACTOR;

                import('../utils/audio_manager.js').then(({ audioManager }) => {
                    if (Math.random() > 0.7) audioManager.play('owl_hoot', 0.2);
                });
            }
            return;
        }

        // Calm down if far enough
        if (this.state === 'flee' && (!canReact || distToPlayer > calmRange)) {
            this.state = 'fly';
            this.timer = 2.0 + Math.random() * 2.0;
            this.flyCenter.copy(this.group.position);
            this.flyRadius = (3 + Math.random() * 5) * SCALE_FACTOR;
            return;
        }

        // Ambient behavior
        this.timer -= this._aiTimer; // approximate tick time
        if (this.timer > 0) return;

        if (this.state === 'perch') {
            // choose hop or fly
            if (Math.random() < 0.55) {
                this.state = 'hop';
                this.timer = 1.2 + Math.random() * 1.8;
                this.wanderAngle = Math.random() * Math.PI * 2;
            } else {
                this.state = 'fly';
                this.timer = 2.5 + Math.random() * 3.5;
                this.flyCenter.copy(this.group.position);
                this.flyAngle = Math.random() * Math.PI * 2;
                this.flyRadius = (3 + Math.random() * 6) * SCALE_FACTOR;
                this.flyHeight = (2.8 + Math.random() * 2.0) * SCALE_FACTOR;
            }
        } else if (this.state === 'hop') {
            this.state = 'perch';
            this.timer = 1.0 + Math.random() * 2.0;
        } else if (this.state === 'fly') {
            // land sometimes
            if (Math.random() < 0.45) {
                this.state = 'perch';
                this.timer = 1.0 + Math.random() * 2.5;
            } else {
                // refresh flight arc
                this.timer = 2.0 + Math.random() * 3.0;
                this.flyCenter.copy(this.group.position);
                this.flyRadius = (3 + Math.random() * 6) * SCALE_FACTOR;
            }
        }
    }

    updateMovement(delta, player) {
        const targetEntity = (this.isSummoned && this.owner) ? this.owner : player;

        if (this.state === 'hop') {
            if (this.isSummoned && this.owner) {
                const toOwner = this._tempVec1.subVectors(this.owner.mesh.position, this.group.position);
                toOwner.y = 0;
                const dist = toOwner.length();
                if (dist > 0.01) {
                    toOwner.normalize();
                    this.group.position.addScaledVector(toOwner, this.moveSpeed * delta);
                    const targetRot = Math.atan2(toOwner.x, toOwner.z);
                    this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetRot, 6 * delta);
                }
            } else {
                const moveVec = this._tempVec1.set(Math.sin(this.wanderAngle), 0, Math.cos(this.wanderAngle));
                this.group.position.addScaledVector(moveVec, this.moveSpeed * delta);
                this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, this.wanderAngle, 6 * delta);
            }
        } else if (this.state === 'fly' || this.state === 'flee') {
            const speed = (this.state === 'flee') ? this.flySpeed * 1.25 : this.flySpeed;

            if (this.isSummoned && this.owner) {
                // Fly toward owner's head area
                const targetPos = this._tempVec2.copy(this.owner.mesh.position);
                targetPos.y += 2 * SCALE_FACTOR;
                
                const toTarget = this._tempVec1.subVectors(targetPos, this.group.position);
                const dist = toTarget.length();
                if (dist > 0.1) {
                    toTarget.normalize();
                    this.group.position.addScaledVector(toTarget, speed * delta);
                    const targetRot = Math.atan2(toTarget.x, toTarget.z);
                    this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetRot, 8 * delta);
                }
            } else {
                // Circle around flyCenter; flee just flies faster & biases away from player
                if (this.state === 'flee' && player && player.mesh) {
                    const away = this._tempVec1.subVectors(this.flyCenter, player.mesh.position).normalize();
                    this.flyCenter.addScaledVector(away, 2.0 * SCALE_FACTOR * delta);
                }

                this.flyAngle += (speed / Math.max(0.001, this.flyRadius)) * delta;

                const targetX = this.flyCenter.x + Math.sin(this.flyAngle) * this.flyRadius;
                const targetZ = this.flyCenter.z + Math.cos(this.flyAngle) * this.flyRadius;

                // Move toward orbit point
                this._tempVec1.set(targetX - this.group.position.x, 0, targetZ - this.group.position.z);
                const dist = this._tempVec1.length();
                if (dist > 0.001) {
                    this._tempVec1.multiplyScalar(1 / dist);
                    this.group.position.addScaledVector(this._tempVec1, speed * delta);

                    const targetRot = Math.atan2(this._tempVec1.x, this._tempVec1.z);
                    this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetRot, 8 * delta);
                }
            }
        } else {
            // perch: minimal drift, just face a direction slowly
            this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, this.wanderAngle, 1.5 * delta);
            if (Math.random() < 0.005) this.wanderAngle = Math.random() * Math.PI * 2;
        }
    }

    updateAnimations(t, delta) {
        const isFlying = (this.state === 'fly' || this.state === 'flee');
        const isMovingGround = (this.state === 'hop');

        // Head bob / look-around
        const headBob = isFlying ? Math.sin(t * 2.5) * 0.08 : isMovingGround ? Math.sin(t * 4.0) * 0.10 : Math.sin(t * 0.8) * 0.05;
        this.headGroup.rotation.x = THREE.MathUtils.lerp(this.headGroup.rotation.x, headBob, 8 * delta);
        this.headGroup.rotation.y = THREE.MathUtils.lerp(this.headGroup.rotation.y, Math.sin(t * 0.6) * 0.12, 3 * delta);

        // Wings
        if (isFlying) {
            const flapSpeed = (this.state === 'flee') ? 12.0 : 8.5;
            const flap = Math.sin(t * flapSpeed);
            
            // Primary flap
            this.leftWing.rotation.z = THREE.MathUtils.lerp(this.leftWing.rotation.z, 0.7 + flap * 0.8, 12 * delta);
            this.rightWing.rotation.z = THREE.MathUtils.lerp(this.rightWing.rotation.z, -0.7 - flap * 0.8, 12 * delta);

            // Wing "rowing" / forward thrust tilt
            const row = Math.cos(t * flapSpeed) * 0.2;
            this.leftWing.rotation.x = THREE.MathUtils.lerp(this.leftWing.rotation.x, -0.3 + row, 10 * delta);
            this.rightWing.rotation.x = THREE.MathUtils.lerp(this.rightWing.rotation.x, -0.3 + row, 10 * delta);

            // Subtle body tilt based on flap
            this.group.rotation.z = THREE.MathUtils.lerp(this.group.rotation.z, flap * 0.05, 5 * delta);
            this.group.rotation.x = THREE.MathUtils.lerp(this.group.rotation.x, -0.15 + Math.abs(flap) * 0.1, 5 * delta);

            // Feet tuck
            this.feet.forEach(f => (f.rotation.x = THREE.MathUtils.lerp(f.rotation.x, 1.2, 10 * delta)));
        } else {
            // Fold wings
            this.leftWing.rotation.z = THREE.MathUtils.lerp(this.leftWing.rotation.z, 0.15, 10 * delta);
            this.rightWing.rotation.z = THREE.MathUtils.lerp(this.rightWing.rotation.z, -0.15, 10 * delta);
            this.leftWing.rotation.x = THREE.MathUtils.lerp(this.leftWing.rotation.x, 0.0, 10 * delta);
            this.rightWing.rotation.x = THREE.MathUtils.lerp(this.rightWing.rotation.x, 0.0, 10 * delta);

            // Feet relax
            this.feet.forEach(f => (f.rotation.x = THREE.MathUtils.lerp(f.rotation.x, 0.0, 10 * delta)));
        }

        // Little hop bounce
        if (isMovingGround) {
            const bounce = Math.abs(Math.sin(t * 6.0)) * 0.12 * SCALE_FACTOR;
            this.group.position.y += bounce * 0.15;
        }
    }
}
