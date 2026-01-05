import * as THREE from 'three';

export const WEATHER_TYPES = {
    CLEAR: 'clear',
    CLOUDY: 'cloudy',
    RAIN: 'rain',
    STORM: 'storm',
    FOG: 'fog',
    SNOWSTORM: 'snowstorm'
};

export class WeatherManager {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        
        this.currentState = WEATHER_TYPES.CLEAR;
        this.targetState = WEATHER_TYPES.CLEAR;
        this.transitionProgress = 1.0; // 0 to 1
        this.transitionSpeed = 2.0; // Much faster transition (0.5 seconds for full transition)
        
        this.stateTimer = 0;
        this.stateDuration = 60; // seconds
        
        this.weatherWeights = {
            [WEATHER_TYPES.CLEAR]: 60,
            [WEATHER_TYPES.CLOUDY]: 20,
            [WEATHER_TYPES.RAIN]: 10,
            [WEATHER_TYPES.STORM]: 5,
            [WEATHER_TYPES.FOG]: 5,
            [WEATHER_TYPES.SNOWSTORM]: 5
        };

        this.rainParticles = null;
        this.snowParticles = null;
        this.initRain();
        this.initSnow();
    }

    initSnow() {
        const count = 60000; // 4x increase
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const velocities = new Float32Array(count);
        const drifts = new Float32Array(count);

        // Increase spread range for higher density without clumping
        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 150;
            positions[i * 3 + 1] = Math.random() * 60;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 150;
            velocities[i] = 4 + Math.random() * 6; // Faster fall for high winds
            drifts[i] = Math.random() * Math.PI * 2;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 1));
        geometry.setAttribute('drift', new THREE.BufferAttribute(drifts, 1));

        const material = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.25,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending
        });

        this.snowParticles = new THREE.Points(geometry, material);
        this.snowParticles.visible = false;
        this.scene.add(this.snowParticles);
    }

    initRain() {
        const count = 5000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const velocities = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 100;
            positions[i * 3 + 1] = Math.random() * 50;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
            velocities[i] = 20 + Math.random() * 10;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 1));

        const material = new THREE.PointsMaterial({
            color: 0xaaaaaa,
            size: 0.1,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });

        this.rainParticles = new THREE.Points(geometry, material);
        this.rainParticles.visible = false;
        this.scene.add(this.rainParticles);
    }

    update(delta) {
        this.updateAreaWeather();
        this.updateState(delta);
        this.updateEffects(delta);
    }

    updateAreaWeather() {
        if (!this.game.player) return;
        const playerPos = this.game.player.mesh.position;
        
        const PLATEAU_X = 7509.5;
        const PLATEAU_Z = -6949.1;
        const dx = playerPos.x - PLATEAU_X;
        const dz = playerPos.z - PLATEAU_Z;
        
        const bowlRadiusSq = 5184.0; // 72^2
        const regionRadiusSq = 22500.0; // 150^2
        const distSq = dx * dx + dz * dz;

        if (distSq < regionRadiusSq) {
            if (distSq < bowlRadiusSq) {
                // Inside the bowl: Force Clear
                if (this.targetState !== WEATHER_TYPES.CLEAR) {
                    this.setWeather(WEATHER_TYPES.CLEAR);
                    // Instant transition for bowl
                    this.currentState = WEATHER_TYPES.CLEAR;
                    this.transitionProgress = 1.0;
                }
                if (this.snowParticles) {
                    this.snowParticles.material.opacity = 0;
                    this.snowParticles.visible = false;
                }
            } else {
                // In the mountains surrounding the bowl: Force Snowstorm
                if (this.targetState !== WEATHER_TYPES.SNOWSTORM) {
                    this.setWeather(WEATHER_TYPES.SNOWSTORM);
                }
            }
            return; // Exit early as we are in a forced weather zone
        }

        // Outside the Yurei shard:
        const currentHeight = this.game.worldManager.getTerrainHeight(playerPos.x, playerPos.z);
        if (currentHeight <= 45.0 && this.targetState === WEATHER_TYPES.SNOWSTORM) {
            // Transition out of snowstorm if we left high altitude and it's currently targeted
            this.pickNextState();
        }
    }

    isPlayerInBowl() {
        if (!this.game.player) return false;
        const playerPos = this.game.player.mesh.position;
        const PLATEAU_X = 7509.5;
        const PLATEAU_Z = -6949.1;
        const dx = playerPos.x - PLATEAU_X;
        const dz = playerPos.z - PLATEAU_Z;
        const bowlRadiusSq = 5184.0; // 72^2
        return (dx * dx + dz * dz) < bowlRadiusSq;
    }

    updateState(delta) {
        if (this.transitionProgress < 1.0) {
            this.transitionProgress = Math.min(1.0, this.transitionProgress + delta * this.transitionSpeed);
        }

        this.stateTimer -= delta;
        
        if (this.stateTimer <= 0) {
            this.pickNextState();
        }
    }

    pickNextState() {
        const totalWeight = Object.values(this.weatherWeights).reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;
        
        let nextState = WEATHER_TYPES.CLEAR;
        for (const [state, weight] of Object.entries(this.weatherWeights)) {
            if (random < weight) {
                nextState = state;
                break;
            }
            random -= weight;
        }

        // Avoid picking the same state if possible, unless it's the only one or we are CLEAR
        if (nextState === this.targetState && Math.random() > 0.3) {
            return this.pickNextState();
        }

        if (nextState !== this.targetState) {
            this.targetState = nextState;
            this.transitionProgress = 0;
            console.log(`Weather transitioning to: ${nextState}`);
        }

        this.stateDuration = 60 + Math.random() * 180; // 60-240 seconds (increased)
        this.stateTimer = this.stateDuration;
    }

    updateEffects(delta) {
        // Update currentState only when transition is complete
        if (this.transitionProgress >= 1.0 && this.currentState !== this.targetState) {
            this.currentState = this.targetState;
        }

        const playerPos = this.game.player.mesh.position;
        
        // Rain Particle logic
        if (this.currentState === WEATHER_TYPES.RAIN || this.currentState === WEATHER_TYPES.STORM) {
            this.rainParticles.visible = true;
            this.rainParticles.position.set(playerPos.x, 0, playerPos.z);
            
            const positions = this.rainParticles.geometry.attributes.position.array;
            const velocities = this.rainParticles.geometry.attributes.velocity.array;
            
            for (let i = 0; i < velocities.length; i++) {
                positions[i * 3 + 1] -= velocities[i] * delta;
                
                if (positions[i * 3 + 1] < 0) {
                    positions[i * 3 + 1] = 50;
                }
            }
            this.rainParticles.geometry.attributes.position.needsUpdate = true;
            
            // Adjust opacity based on transition
            const targetOpacity = this.currentState === WEATHER_TYPES.STORM ? 0.8 : 0.5;
            this.rainParticles.material.opacity = THREE.MathUtils.lerp(
                this.rainParticles.material.opacity, 
                targetOpacity, 
                delta
            );
        } else {
            this.rainParticles.material.opacity = THREE.MathUtils.lerp(this.rainParticles.material.opacity, 0, delta * 2);
            if (this.rainParticles.material.opacity < 0.01) {
                this.rainParticles.visible = false;
            }
        }

        // Snow Particle logic
        if (this.currentState === WEATHER_TYPES.SNOWSTORM) {
            this.snowParticles.visible = true;
            this.snowParticles.position.set(playerPos.x, 0, playerPos.z);
            
            const positions = this.snowParticles.geometry.attributes.position.array;
            const velocities = this.snowParticles.geometry.attributes.velocity.array;
            const drifts = this.snowParticles.geometry.attributes.drift.array;
            
            const time = performance.now() * 0.001;
            
            for (let i = 0; i < velocities.length; i++) {
                positions[i * 3 + 1] -= velocities[i] * delta;
                // High winds: extreme horizontal drift and turbulence
                positions[i * 3] += (Math.sin(time * 2 + drifts[i]) * 8 + 15) * delta; 
                positions[i * 3 + 2] += (Math.cos(time * 1.5 + drifts[i]) * 5) * delta;
                
                if (positions[i * 3 + 1] < 0) {
                    positions[i * 3 + 1] = 60;
                    // Randomize horizontal slightly on reset to prevent patterns
                    positions[i * 3] = (Math.random() - 0.5) * 150;
                    positions[i * 3 + 2] = (Math.random() - 0.5) * 150;
                }
            }
            this.snowParticles.geometry.attributes.position.needsUpdate = true;
            
            this.snowParticles.material.opacity = THREE.MathUtils.lerp(
                this.snowParticles.material.opacity, 
                1.0, 
                delta
            );
        } else {
            const fadeSpeed = (this.targetState === WEATHER_TYPES.CLEAR) ? delta * 6 : delta * 2;
            this.snowParticles.material.opacity = THREE.MathUtils.lerp(this.snowParticles.material.opacity, 0, fadeSpeed);
            if (this.snowParticles.material.opacity < 0.01) {
                this.snowParticles.visible = false;
            }
        }

        // Lightning flash in Storm
        if (this.currentState === WEATHER_TYPES.STORM && Math.random() < 0.005) {
            this.triggerLightning();
        }
    }

    triggerLightning() {
        if (!this.game.sun) return;
        
        const originalIntensity = this.game.sun.intensity;
        this.game.sun.intensity = 5.0; // Flash!
        
        setTimeout(() => {
            this.game.sun.intensity = originalIntensity;
        }, 50 + Math.random() * 100);
    }

    setWeather(type) {
        if (WEATHER_TYPES[type.toUpperCase()] || Object.values(WEATHER_TYPES).includes(type)) {
            const nextState = WEATHER_TYPES[type.toUpperCase()] || type;
            if (this.targetState === nextState) return;
            
            this.targetState = nextState;
            this.transitionProgress = 0;
            this.stateTimer = 300; // Keep it for 5 minutes by default when manually set
            console.log(`Weather manually set to: ${nextState}`);
        }
    }

    getWeatherIntensity() {
        // Returns 0 (clear) to 1 (storm/fog)
        const intensities = {
            [WEATHER_TYPES.CLEAR]: 0,
            [WEATHER_TYPES.CLOUDY]: 0.3,
            [WEATHER_TYPES.RAIN]: 0.6,
            [WEATHER_TYPES.STORM]: 0.9,
            [WEATHER_TYPES.FOG]: 1.0,
            [WEATHER_TYPES.SNOWSTORM]: 1.0
        };
        
        const currentIntensity = intensities[this.currentState] || 0;
        const targetIntensity = intensities[this.targetState] || 0;

        return THREE.MathUtils.lerp(currentIntensity, targetIntensity, this.transitionProgress);
    }
}
