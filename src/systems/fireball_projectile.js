import * as THREE from 'three';

export class FireballProjectile {
    constructor(scene, startPos, targetPos, owner) {
        this.scene = scene;
        this.owner = owner;
        this.isDead = false;
        this.speed = 30;
        this.damage = 25;
        this.lifeTime = 2.0;
        this.startPos = startPos.clone();
        this.maxDistance = 10;

        // Create projectile group
        this.group = new THREE.Group();
        this.group.position.copy(startPos);
        this.group.position.y += 1.2; 
        this.scene.add(this.group);

        // Direction from spawn position to mouse world position
        this.direction = new THREE.Vector3().subVectors(targetPos, this.group.position);
        this.direction.y = 0; 
        this.direction.normalize();

        // Billboard sprite for the fireball texture
        const loader = new THREE.TextureLoader();
        const texture = loader.load('assets/vfx/fireball.png');
        const spriteMat = new THREE.SpriteMaterial({ 
            map: texture, 
            color: 0xffffff,
            transparent: true,
            blending: THREE.AdditiveBlending
        });
        this.sprite = new THREE.Sprite(spriteMat);
        this.sprite.scale.set(1.5, 1.5, 1);
        this.sprite.material.rotation = Math.PI; // Rotate 180 degrees
        this.group.add(this.sprite);

        // Core glow sphere
        const coreGeo = new THREE.SphereGeometry(0.3, 16, 16);
        const coreMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
        this.core = new THREE.Mesh(coreGeo, coreMat);
        this.group.add(this.core);

        // Add point light for glow
        this.light = new THREE.PointLight(0xff6600, 3, 10);
        this.group.add(this.light);

        // Trail effect setup
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

        // Check distance limit
        if (this.group.position.distanceTo(this.startPos) > this.maxDistance) {
            this.die();
            return;
        }

        // Move
        this.group.position.add(this.direction.clone().multiplyScalar(this.speed * delta));

        // Animated flaming effect (flicker and pulse)
        const t = performance.now() * 0.01;
        const pulse = 1.0 + Math.sin(t * 2) * 0.1;
        this.sprite.scale.set(1.5 * pulse, 1.5 * pulse, 1);
        this.sprite.material.opacity = 0.8 + Math.sin(t * 3) * 0.2;
        
        this.core.scale.setScalar(0.8 + Math.sin(t * 4) * 0.2);
        this.light.intensity = 2.5 + Math.sin(t * 5) * 1.5;

        // Simple trail logic
        if (performance.now() - this.lastParticleSpawn > 50) {
            this.spawnTrailParticle();
            this.lastParticleSpawn = performance.now();
        }

        this.updateTrail(delta);

        // Check collisions (simplified)
        if (this.owner && this.owner.game && this.owner.game.worldManager) {
            const wm = this.owner.game.worldManager;
            const npcs = wm.getNearbyNPCs(this.group.position, 2);
            const fauna = wm.getNearbyFauna(this.group.position, 2);
            
            const targets = [...npcs, ...fauna];
            for (const target of targets) {
                if (target === this.owner || target.isDead) continue;
                
                const targetPos = (target.group || target.mesh).position;
                const dist = this.group.position.distanceTo(targetPos);
                if (dist < 1.5) {
                    if (target.takeDamage) target.takeDamage(this.damage, this.group.position, this.owner);
                    this.die();
                    return;
                }
            }
        }
    }

    spawnTrailParticle() {
        const geo = new THREE.SphereGeometry(0.2, 8, 8);
        const mat = new THREE.MeshBasicMaterial({ 
            color: 0xff4400, 
            transparent: true, 
            opacity: 0.6 
        });
        const p = new THREE.Mesh(geo, mat);
        p.position.copy(this.group.position);
        p.position.add(new THREE.Vector3(
            (Math.random() - 0.5) * 0.4,
            (Math.random() - 0.5) * 0.4,
            (Math.random() - 0.5) * 0.4
        ));
        this.scene.add(p);
        this.trailParticles.push({ mesh: p, life: 0.5 });
    }

    updateTrail(delta) {
        for (let i = this.trailParticles.length - 1; i >= 0; i--) {
            const p = this.trailParticles[i];
            p.life -= delta;
            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                this.trailParticles.splice(i, 1);
            } else {
                p.mesh.scale.multiplyScalar(0.95);
                p.mesh.material.opacity = p.life * 1.2;
            }
        }
    }

    die() {
        if (this.isDead) return;
        this.isDead = true;
        this.scene.remove(this.group);
        
        // Clean up remaining trail particles
        this.trailParticles.forEach(p => this.scene.remove(p.mesh));
        this.trailParticles = [];
    }
}
