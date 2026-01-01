import * as THREE from 'three';

export class IceboltProjectile {
    constructor(scene, startPos, targetPos, owner) {
        this.scene = scene;
        this.owner = owner;
        this.isDead = false;
        this.speed = 40;
        this.damage = 15;
        this.startPos = startPos.clone();
        this.maxDistance = 10;
        this.elapsed = 0;
        this.lifeTime = 1.5;

        // Create projectile group
        this.group = new THREE.Group();
        this.group.position.copy(startPos);
        this.scene.add(this.group);

        // Direction
        this.direction = new THREE.Vector3().subVectors(targetPos, this.group.position);
        this.direction.y = 0;
        this.direction.normalize();

        // Visuals: Ice Spike/Bolt
        const geometry = new THREE.ConeGeometry(0.15, 0.8, 8);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x88ccff,
            transparent: true,
            opacity: 0.8
        });
        this.mesh = new THREE.Mesh(geometry, material);
        
        // Rotate cone to point in direction
        this.mesh.rotation.x = Math.PI / 2;
        const lookTarget = this.group.position.clone().add(this.direction);
        this.group.lookAt(lookTarget);
        this.group.add(this.mesh);

        // Add sprite glow
        const loader = new THREE.TextureLoader();
        const texture = loader.load('icebolt.png');
        const spriteMat = new THREE.SpriteMaterial({
            map: texture,
            color: 0xffffff,
            transparent: true,
            blending: THREE.AdditiveBlending
        });
        this.sprite = new THREE.Sprite(spriteMat);
        this.sprite.scale.set(1.0, 1.0, 1);
        this.group.add(this.sprite);

        this.light = new THREE.PointLight(0x00aaff, 2, 8);
        this.group.add(this.light);

        this.trailParticles = [];
        this.lastParticleSpawn = 0;
    }

    update(delta) {
        if (this.isDead) return;

        this.elapsed += delta;
        if (this.elapsed > this.lifeTime) {
            this.die();
            return;
        }

        if (this.group.position.distanceTo(this.startPos) > this.maxDistance) {
            this.die();
            return;
        }

        this.group.position.add(this.direction.clone().multiplyScalar(this.speed * delta));

        // Pulsing glow
        const t = performance.now() * 0.01;
        this.light.intensity = 1.5 + Math.sin(t * 8) * 0.5;
        this.sprite.scale.setScalar(1.0 + Math.sin(t * 10) * 0.1);

        if (performance.now() - this.lastParticleSpawn > 40) {
            this.spawnTrailParticle();
            this.lastParticleSpawn = performance.now();
        }
        this.updateTrail(delta);

        // Collision
        if (this.owner && this.owner.game && this.owner.game.worldManager) {
            const wm = this.owner.game.worldManager;
            const targets = [...wm.getNearbyNPCs(this.group.position, 2), ...wm.getNearbyFauna(this.group.position, 2)];
            for (const target of targets) {
                if (target === this.owner || target.isDead) continue;
                const targetPos = (target.group || target.mesh).position;
                if (this.group.position.distanceTo(targetPos) < 1.2) {
                    if (target.takeDamage) target.takeDamage(this.damage, this.group.position, this.owner);
                    this.die();
                    return;
                }
            }
        }
    }

    spawnTrailParticle() {
        const geo = new THREE.SphereGeometry(0.1, 6, 6);
        const mat = new THREE.MeshBasicMaterial({ color: 0xccffff, transparent: true, opacity: 0.5 });
        const p = new THREE.Mesh(geo, mat);
        p.position.copy(this.group.position);
        this.scene.add(p);
        this.trailParticles.push({ mesh: p, life: 0.4 });
    }

    updateTrail(delta) {
        for (let i = this.trailParticles.length - 1; i >= 0; i--) {
            const p = this.trailParticles[i];
            p.life -= delta;
            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                this.trailParticles.splice(i, 1);
            } else {
                p.mesh.scale.multiplyScalar(0.92);
                p.mesh.material.opacity = p.life * 1.2;
            }
        }
    }

    die() {
        if (this.isDead) return;
        this.isDead = true;
        this.scene.remove(this.group);
        this.trailParticles.forEach(p => this.scene.remove(p.mesh));
        this.trailParticles = [];
    }
}
