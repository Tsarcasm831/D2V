
import * as THREE from 'three';
import { PlayerMaterials } from './PlayerMaterials';
import { PlayerPartsRegistry } from './PlayerPartsRegistry';

export class PlayerDebugManager {
    private registry: PlayerPartsRegistry;
    private materials: PlayerMaterials;
    private lastDebugHead: boolean = false;

    private debugHeadMaterials: Record<string, THREE.Material> = {
        'HeadTop': new THREE.MeshStandardMaterial({ color: 0xff5555, roughness: 0.5, name: 'DebugTop' }), 
        'HeadFront': new THREE.MeshStandardMaterial({ color: 0x55ffff, roughness: 0.5, name: 'DebugFront' }), 
        'HeadCheeksBottom': new THREE.MeshStandardMaterial({ color: 0x800080, roughness: 0.5, name: 'DebugCheeksBottom' }), 
        'HeadBackTop': new THREE.MeshStandardMaterial({ color: 0x8888ff, roughness: 0.5, name: 'DebugBackTop' }), 
        'HeadBackMiddle': new THREE.MeshStandardMaterial({ color: 0x4444ff, roughness: 0.5, name: 'DebugBackMiddle' }), 
        'HeadBackBottom': new THREE.MeshStandardMaterial({ color: 0x000088, roughness: 0.5, name: 'DebugBackBottom' }), 
        'MaxillaMesh': new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.5, name: 'DebugMaxilla' }), 
        'JawMesh': new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.5, name: 'DebugJaw' }), 
    };

    constructor(registry: PlayerPartsRegistry, materials: PlayerMaterials) {
        this.registry = registry;
        this.materials = materials;
    }

    update(debugHead: boolean) {
        if (debugHead !== this.lastDebugHead) {
            this.toggleHeadDebug(debugHead);
            this.lastDebugHead = debugHead;
        }
    }

    private toggleHeadDebug(enabled: boolean) {
        const headGroup = this.registry.parts.head as THREE.Group;
        if (!headGroup) return;

        headGroup.traverse((obj) => {
             if (obj instanceof THREE.Mesh) {
                 if (this.debugHeadMaterials[obj.name]) {
                     obj.material = enabled ? this.debugHeadMaterials[obj.name] : this.materials.skin;
                 }
             }
        });
    }
}
