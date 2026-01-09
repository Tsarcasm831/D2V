
import * as THREE from 'three';
import { PlayerConfig } from '../../types';
import { PlayerPartsRegistry } from './PlayerPartsRegistry';
import { PlayerMaterials } from './PlayerMaterials';
import { HairBuilder } from './mesh/HairBuilder';

export class PlayerHairManager {
    private partsRegistry: PlayerPartsRegistry;
    private materials: PlayerMaterials;
    
    private lastHairHash: string = '';
    private hairInertia = new THREE.Vector3();
    private hairTargetInertia = new THREE.Vector3();

    constructor(registry: PlayerPartsRegistry, materials: PlayerMaterials) {
        this.partsRegistry = registry;
        this.materials = materials;
    }

    updateConfig(config: PlayerConfig) {
        const hash = `${config.hairStyle}_${config.headScale}`;
        if (hash === this.lastHairHash) return;
        this.lastHairHash = hash;
        
        // Toggle visibility of the base cap mesh so it's not visible when bald
        const head = this.partsRegistry.parts.head;
        if (head) {
            const hairCap = head.getObjectByName('HairCap');
            if (hairCap) {
                hairCap.visible = config.hairStyle !== 'bald';
            }
        }
        
        HairBuilder.build(this.partsRegistry.parts, config, this.materials.hair);
    }

    updatePhysics(dt: number, velocity: THREE.Vector3) {
        const head = this.partsRegistry.parts.head;
        if (head) {
             const hairMesh = head.getObjectByName('HairInstanced') as THREE.InstancedMesh;
             
             // Get Inverse World Rotation of Head to transform World vectors to Head Local Space
             const invHeadRot = new THREE.Quaternion();
             head.getWorldQuaternion(invHeadRot);
             invHeadRot.invert();

             // 1. Inertia (Drag)
             // Basic approximation: World velocity damped
             this.hairTargetInertia.copy(velocity).multiplyScalar(-0.06);
             
             // Clamp max bend to avoid looking broken
             this.hairTargetInertia.clampLength(0, 0.15);
             
             // Transform world inertia vector into head's local space
             this.hairTargetInertia.applyQuaternion(invHeadRot);

             // 2. Spring/Damp towards target
             const spring = 8.0 * dt;
             this.hairInertia.lerp(this.hairTargetInertia, spring);

             // 3. Apply to Shader Uniforms
             if (hairMesh && hairMesh.userData.uInertia) {
                 hairMesh.userData.uInertia.value.copy(this.hairInertia);
                 
                 // 4. Gravity
                 if (hairMesh.userData.uGravity) {
                     // World Down (0, -1, 0)
                     const worldGravity = new THREE.Vector3(0, -1, 0);
                     // Transform to Head Local Space
                     worldGravity.applyQuaternion(invHeadRot);
                     // Scale gravity (sag amount)
                     worldGravity.multiplyScalar(0.05); 
                     
                     hairMesh.userData.uGravity.value.copy(worldGravity);
                 }
             }
        }
    }
    
    syncColor(color: string) {
        const head = this.partsRegistry.parts.head;
        const hairMesh = head?.getObjectByName('HairInstanced') as THREE.InstancedMesh;
        if (hairMesh && hairMesh.material) {
             (hairMesh.material as THREE.MeshToonMaterial).color.set(color);
        }
    }
}
