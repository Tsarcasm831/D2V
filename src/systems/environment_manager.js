import * as THREE from 'three';

export class EnvironmentManager {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        this.sky = null;
        this.sun = game.sun;
        
        this.initSky();
    }

    initSky() {
        // Create a large sphere for the sky
        const geometry = new THREE.SphereGeometry(1000, 32, 32);
        
        // Custom shader for a simple gradient sky
        const material = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(0x0077ff) },
                bottomColor: { value: new THREE.Color(0xffffff) },
                offset: { value: 33 },
                exponent: { value: 0.6 }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                varying vec3 vWorldPosition;
                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
                }
            `,
            side: THREE.BackSide
        });

        this.sky = new THREE.Mesh(geometry, material);
        this.scene.add(this.sky);

        // Update fog to match sky better
        this.scene.fog = new THREE.FogExp2(0x89b2d9, 0.002);
        this.scene.background = new THREE.Color(0x89b2d9);
    }

    update(playerPos) {
        if (this.sky) {
            // Keep the sky centered on the player
            this.sky.position.copy(playerPos);
        }
        
        // Throttle day/night cycle updates to ~10 FPS to save performance
        this._envUpdateTimer = (this._envUpdateTimer || 0) + this.game.clock.getDelta();
        if (this._envUpdateTimer >= 0.1) {
            this.updateDayNightCycle();
            this._envUpdateTimer = 0;
        }
    }

    updateDayNightCycle() {
        if (!this.game.timeManager) return;

        const time = this.game.timeManager.timeOfDay;
        const sunIntensity = this.game.timeManager.getSunIntensity();
        const weatherIntensity = this.game.weatherManager ? this.game.weatherManager.getWeatherIntensity() : 0;
        const weatherType = this.game.weatherManager ? this.game.weatherManager.currentState : 'clear';
        
        // 1. Directional Light (Sun) Angle & Intensity
        // Angle: rotate around X axis based on time (6 AM is 0, 12 PM is PI/2, 6 PM is PI)
        const sunAngle = ((time - 6) / 24) * Math.PI * 2;
        const sunDist = 100;
        
        if (this.sun) {
            // Smooth intensity: 0 at night, up to 1.0 at noon
            // Reduce sun intensity during bad weather
            const baseIntensity = Math.max(0, sunIntensity);
            const weatherReduction = 1.0 - (weatherIntensity * 0.7);
            this.sun.intensity = baseIntensity * 1.2 * weatherReduction;
            
            // Position sun in the sky relative to player
            const playerPos = this.game.player.mesh.position;
            this.sun.position.set(
                playerPos.x + Math.cos(sunAngle) * sunDist,
                playerPos.y + Math.sin(sunAngle) * sunDist,
                playerPos.z + 30 // Slight offset for shadows
            );
            
            // Disable shadows at night or during heavy storms to save performance
            this.sun.castShadow = (baseIntensity > 0.1) && (weatherIntensity < 0.8);
        }

        // 2. Ambient Light Intensity
        // Night is not pitch black, but dim blue
        // Desaturate and dim ambient during bad weather
        const ambientIntensity = (0.1 + Math.max(0, sunIntensity) * 0.4) * (1.0 - weatherIntensity * 0.3);
        const ambientColor = new THREE.Color().setHSL(0.6, 0.5 - weatherIntensity * 0.4, 0.1 + Math.max(0, sunIntensity) * 0.2);
        
        const ambient = this.scene.children.find(c => c instanceof THREE.AmbientLight);
        if (ambient) {
            ambient.intensity = ambientIntensity;
            ambient.color.copy(ambientColor);
        }

        // 3. Skybox & Fog
        // Update shader uniforms for day/night/weather colors
        if (this.sky && this.sky.material.uniforms) {
            let dayTop = new THREE.Color(0x0077ff);
            let dayBottom = new THREE.Color(0xffffff);
            let nightTop = new THREE.Color(0x050a14);
            let nightBottom = new THREE.Color(0x0a1428);

            // Adjust colors for weather
            if (weatherIntensity > 0) {
                const weatherColor = new THREE.Color(0x444444);
                if (weatherType === 'fog') {
                    weatherColor.set(0x888888);
                }
                dayTop.lerp(weatherColor, weatherIntensity * 0.8);
                dayBottom.lerp(weatherColor, weatherIntensity * 0.8);
                nightTop.lerp(new THREE.Color(0x111111), weatherIntensity * 0.5);
                nightBottom.lerp(new THREE.Color(0x111111), weatherIntensity * 0.5);
            }
            
            const lerpFactor = Math.max(0, sunIntensity);
            this.sky.material.uniforms.topColor.value.lerpColors(nightTop, dayTop, lerpFactor);
            this.sky.material.uniforms.bottomColor.value.lerpColors(nightBottom, dayBottom, lerpFactor);
        }

        // Update Fog to match sky
        if (this.scene.fog) {
            let dayFog = new THREE.Color(0x89b2d9);
            let nightFog = new THREE.Color(0x050a14);
            
            if (weatherIntensity > 0) {
                const weatherFogColor = (weatherType === 'fog') ? new THREE.Color(0xaaaaaa) : new THREE.Color(0x444444);
                dayFog.lerp(weatherFogColor, weatherIntensity);
                nightFog.lerp(new THREE.Color(0x111111), weatherIntensity * 0.5);
            }

            const lerpFactor = Math.max(0, sunIntensity);
            this.scene.fog.color.lerpColors(nightFog, dayFog, lerpFactor);
            
            // Adjust fog density based on weather
            const baseDensity = 0.002;
            let targetDensity = baseDensity;
            
            if (weatherType === 'fog') {
                targetDensity = 0.05;
            } else if (weatherType === 'snowstorm') {
                targetDensity = 0.35;
            } else if (weatherType === 'storm' || weatherType === 'rain') {
                targetDensity = 0.01;
            }
            
            // Apply weather intensity for smooth transition
            const finalTarget = baseDensity + (targetDensity - baseDensity) * weatherIntensity;
            
            // If weather is clear or intensity is 0, ensure we hit baseDensity exactly
            const lerpSpeed = (weatherIntensity < 0.01) ? 0.3 : 0.15;
            this.scene.fog.density = THREE.MathUtils.lerp(this.scene.fog.density, finalTarget, lerpSpeed);
        }
    }
}
