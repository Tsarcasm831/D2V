import * as THREE from 'three';

export class PlayerDebugManager {
    constructor(registry, materials) {
        this.registry = registry;
        this.materials = materials;
        this.lastDebugHead = false;

        this.debugHeadMaterials = {
            'HeadTop': new THREE.MeshStandardMaterial({ color: 0xff5555, roughness: 0.5, name: 'DebugTop' }), 
            'HeadFront': new THREE.MeshStandardMaterial({ color: 0x55ffff, roughness: 0.5, name: 'DebugFront' }), 
            'HeadCheeksBottom': new THREE.MeshStandardMaterial({ color: 0x800080, roughness: 0.5, name: 'DebugCheeksBottom' }), 
            'HeadBackTop': new THREE.MeshStandardMaterial({ color: 0x8888ff, roughness: 0.5, name: 'DebugBackTop' }), 
            'HeadBackMiddle': new THREE.MeshStandardMaterial({ color: 0x4444ff, roughness: 0.5, name: 'DebugBackMiddle' }), 
            'HeadBackBottom': new THREE.MeshStandardMaterial({ color: 0x000088, roughness: 0.5, name: 'DebugBackBottom' }), 
            'MaxillaMesh': new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.5, name: 'DebugMaxilla' }), 
            'JawMesh': new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.5, name: 'DebugJaw' }), 
        };
    }

    update(debugHead) {
        if (debugHead !== this.lastDebugHead) {
            this.toggleHeadDebug(debugHead);
            this.lastDebugHead = debugHead;
        }
    }

    toggleHeadDebug(enabled) {
        const headGroup = this.registry.parts.head;
        if (!headGroup) return;

        headGroup.traverse((obj) => {
             if (obj.isMesh) {
                 if (this.debugHeadMaterials[obj.name]) {
                     obj.material = enabled ? this.debugHeadMaterials[obj.name] : this.materials.skin;
                 }
             }
        });
    }
}
