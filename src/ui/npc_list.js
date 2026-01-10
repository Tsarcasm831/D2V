import * as THREE from 'three';
import { AssetLoader } from '../core/asset_loader.js';
import { AssassinNPC } from '../entities/enemy_npc_assassin_1.js';
import { IceTitan } from '../entities/boss_ice_titan.js';
import { KonohaNinjaNPC } from '../entities/konoha_ninja_npc.js';
import { QuestGiver } from '../entities/quest_giver.js';
import { NPC } from '../entities/npc.js';
import { BossEnemy } from '../entities/boss_enemy.js';
import { SCALE_FACTOR } from '../world/world_bounds.js';

export class NPCList {
    constructor() {
        this.container = document.querySelector('.npc-list-container');
        this.screen = document.getElementById('npc-list-screen');
        this.backBtn = document.getElementById('npc-list-back');
        
        if (this.backBtn) {
            this.backBtn.onclick = () => {
                this.hide();
                if (window.showMainMenu) window.showMainMenu();
            };
        }

        this.generated = false;
        this.renderer = null;
    }

    async show() {
        if (this.screen) this.screen.style.display = 'flex';
        
        // Ensure assets are loaded for previews
        const loader = new AssetLoader();
        // Simple check if assets are loaded. AssetLoader.loaded is just a count.
        // If we haven't run the game yet, we might need to load.
        // We'll force loadAll, it returns immediately if promises are resolved or cache full?
        // AssetLoader.loadAll checks cache, but let's be safe.
        if (loader.loaded < loader.total) {
             this.container.innerHTML = '<div style="color:white; text-align:center; font-size: 24px; margin-top: 100px;">Loading Assets...</div>';
             // We need to wait a bit for UI to update
             await new Promise(r => requestAnimationFrame(r));
             await loader.loadAll();
        }

        if (!this.generated) {
            await this.generateCards();
            this.generated = true;
        }
    }

    hide() {
        if (this.screen) this.screen.style.display = 'none';
    }

    async generateCards() {
        this.container.innerHTML = '';
        
        // Setup offscreen renderer for screenshots
        const width = 256;
        const height = 300;
        if (!this.renderer) {
            this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
            this.renderer.setSize(width, height);
            this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        }

        const scene = new THREE.Scene();
        // scene.background = new THREE.Color(0x1a2639); 
        // Use transparent background so we can style with CSS
        
        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
        camera.position.set(0, 1.2, 3.5);
        camera.lookAt(0, 0.8, 0);

        // Lighting
        const amb = new THREE.AmbientLight(0xffffff, 0.7);
        scene.add(amb);
        const dir = new THREE.DirectionalLight(0xffffff, 1.2);
        dir.position.set(2, 5, 5);
        scene.add(dir);
        
        // Back light for rim effect
        const backLight = new THREE.DirectionalLight(0x5555ff, 0.5);
        backLight.position.set(-2, 2, -5);
        scene.add(backLight);

        // Container group to easily clear NPCs
        const npcContainer = new THREE.Group();
        scene.add(npcContainer);

        // Define NPCs to show
        // We instantiate them to get stats and preview
        const npcDefinitions = [
            { Class: AssassinNPC, name: "Assassin", desc: "A deadly killer who stalks from the shadows. Watch your back.", type: "Enemy" },
            { Class: KonohaNinjaNPC, name: "Konoha Ninja", desc: "A swift warrior from a hidden village trained in the arts of stealth.", type: "Neutral" },
            { Class: IceTitan, name: "Ice Titan", desc: "A massive golem of living ice that guards the frozen peaks.", type: "Boss" },
            { Class: BossEnemy, name: "Forest Guardian", desc: "A powerful entity protecting the woodlands.", type: "Boss" },
            { Class: QuestGiver, name: "Quest Giver", desc: "Offers tasks and rewards to travelers seeking adventure.", type: "Friendly" },
            { Class: NPC, name: "Villager", desc: "A common inhabitant of the steppes trying to survive.", type: "Friendly" }
        ];

        // Process sequentially
        for (const def of npcDefinitions) {
            npcContainer.clear();

            // Mock shard/pos
            const mockShard = { worldManager: null, npcs: [], getTerrainHeight: () => 0 };
            const mockPos = new THREE.Vector3(0, 0, 0);
            
            let entity = null;
            try {
                // Pass npcContainer as the 'scene' so the NPC adds itself to it
                entity = new def.Class(npcContainer, mockShard, mockPos);
            } catch (e) {
                console.error("Failed to create NPC for preview:", def.name, e);
                continue;
            }

            // Entity adjustments for preview
            if (entity.group || entity.mesh) {
                 const root = entity.group || entity.mesh;
                 
                 // Specific adjustments
                 if (def.name === 'Ice Titan') {
                     root.scale.set(0.35, 0.35, 0.35);
                     root.position.y = -0.5;
                     root.rotation.y = Math.PI / 6;
                 } else if (def.name === 'Forest Guardian') {
                     // BossEnemy base class doesn't have much mesh, but let's see
                     // It calls setupMesh which is empty in base.
                     // It adds a label. 
                     // We might want to skip base BossEnemy or give it a mesh
                 } else {
                     root.rotation.y = Math.PI / 8; // Slight angle
                 }
                 
                 // Animation? We can try to tick it once to set initial pose
                 if (entity.animator) {
                     entity.animator.animate(0.016, false, false, false, false, false, 'none', 0, 0, false, 0, 0, false, 'hips', new THREE.Vector3(), 0, null, false, 0, 0);
                 }
            }

            // Render
            this.renderer.render(scene, camera);
            const imgData = this.renderer.domElement.toDataURL();

            // Create Card
            const card = document.createElement('div');
            card.className = 'npc-card';
            
            // Stats
            const hp = entity.maxHealth || 10;
            const lvl = entity.level || 1;
            
            card.innerHTML = `
                <div class="npc-card-preview">
                    <img src="${imgData}" alt="${def.name}">
                </div>
                <div class="npc-card-content">
                    <div class="npc-header">
                        <div class="npc-name">${def.name}</div>
                        <div class="npc-badge npc-type-${def.type.toLowerCase()}">${def.type}</div>
                    </div>
                    <div class="npc-stats-row">
                        <div class="npc-stat"><span class="stat-label">HP</span> ${hp}</div>
                        <div class="npc-stat"><span class="stat-label">LVL</span> ${lvl}</div>
                    </div>
                    <div class="npc-desc">${def.desc}</div>
                </div>
            `;
            this.container.appendChild(card);
        }
        
        // Clean up
        npcContainer.clear();
    }
}
