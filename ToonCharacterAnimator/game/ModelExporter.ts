
import * as THREE from 'three';
import JSZip from 'jszip';
import { Player } from './Player';

export class ModelExporter {
    static async exportAndDownloadZip(player: Player) {
        const root = player.model.group;
        const skipIds = new Set<string>();
        const modelAny = player.model as any;

        // --- IDENTIFY PARTS TO SKIP ---
        if (modelAny.shirtMeshes) (modelAny.shirtMeshes as THREE.Object3D[]).forEach((m: THREE.Object3D) => skipIds.add(m.uuid));
        if (modelAny.parts.underwearBottom) skipIds.add(modelAny.parts.underwearBottom.uuid);
        if (modelAny.parts.braStrap) skipIds.add(modelAny.parts.braStrap.uuid);
        if (modelAny.parts.braCups) (modelAny.parts.braCups as THREE.Object3D[]).forEach((m: THREE.Object3D) => skipIds.add(m.uuid));
        
        const shouldSkipName = (name: string) => name === 'undie' || name === 'HitboxOverlay';

        // --- BUFFERS ---
        let mainScript = `import * as THREE from 'three';
import * as DATA from './geometryData';

export class ExportedCharacter {
    group: THREE.Group;

    constructor() {
        this.group = new THREE.Group();
        this.build();
    }

    private build() {
        const materialCache: { [color: string]: THREE.MeshStandardMaterial } = {};
        const getMaterial = (color: number) => {
            const hex = '#' + color.toString(16).padStart(6, '0');
            if (!materialCache[hex]) {
                materialCache[hex] = new THREE.MeshStandardMaterial({ 
                    color: color, 
                    roughness: 0.7,
                    metalness: 0.1
                });
            }
            return materialCache[hex];
        };
`;

        let dataScript = `// Auto-generated Geometry Data\n`;
        let nodeCounter = 0;

        // --- RECURSIVE TRAVERSAL ---
        const processNode = (node: THREE.Object3D, parentVar: string) => {
            if (skipIds.has(node.uuid) || shouldSkipName(node.name)) return;
            if (!node.visible) return;

            const varName = `n${nodeCounter++}`;
            
            // Transform
            const p = node.position;
            const r = node.rotation;
            const s = node.scale;
            const fmt = (n: number) => {
                const str = n.toFixed(4);
                return str.indexOf('.') > -1 ? str.replace(/\.?0+$/, '') : str;
            };

            const transformCode = `
        ${varName}.position.set(${fmt(p.x)}, ${fmt(p.y)}, ${fmt(p.z)});
        ${varName}.rotation.set(${fmt(r.x)}, ${fmt(r.y)}, ${fmt(r.z)});
        ${varName}.scale.set(${fmt(s.x)}, ${fmt(s.y)}, ${fmt(s.z)});
        ${parentVar}.add(${varName});`;

            if (node instanceof THREE.Mesh) {
                const geo = node.geometry;
                const pos = geo.attributes.position;
                const norm = geo.attributes.normal;
                const idx = geo.index;
                
                // Export Data to dataScript
                const posArray = Array.from(pos.array).map((n: number) => parseFloat(n.toFixed(3)));
                dataScript += `export const ${varName}_pos = [${posArray.join(',')}];\n`;

                let normRef = '';
                if (norm) {
                    const normArray = Array.from(norm.array).map((n: number) => parseFloat(n.toFixed(3)));
                    dataScript += `export const ${varName}_norm = [${normArray.join(',')}];\n`;
                    normRef = `geo_${varName}.setAttribute('normal', new THREE.Float32BufferAttribute(DATA.${varName}_norm, 3));`;
                }

                let idxRef = '';
                if (idx) {
                    const idxArray = Array.from(idx.array);
                    dataScript += `export const ${varName}_idx = [${idxArray.join(',')}];\n`;
                    idxRef = `geo_${varName}.setIndex(DATA.${varName}_idx);`;
                }

                // Material Color
                let color = 0xffffff;
                if (node.material) {
                    const mat = Array.isArray(node.material) ? node.material[0] : node.material;
                    if (mat && 'color' in mat) color = (mat as any).color.getHex();
                }

                mainScript += `
        // Mesh: ${node.name || 'Unnamed'}
        const geo_${varName} = new THREE.BufferGeometry();
        geo_${varName}.setAttribute('position', new THREE.Float32BufferAttribute(DATA.${varName}_pos, 3));
        ${normRef}
        ${idxRef}
        
        const ${varName} = new THREE.Mesh(geo_${varName}, getMaterial(0x${color.toString(16)}));
        ${varName}.castShadow = true;
        ${varName}.receiveShadow = true;
        ${transformCode}
`;
            } else {
                mainScript += `
        // Group: ${node.name || 'Unnamed'}
        const ${varName} = new THREE.Group();
        ${transformCode}
`;
            }

            node.children.forEach(child => processNode(child, varName));
        };

        processNode(root, 'this.group');

        mainScript += `
    }
}`;

        // --- ZIP & DOWNLOAD ---
        const zip = new JSZip();
        zip.file("ExportedCharacter.ts", mainScript);
        zip.file("geometryData.ts", dataScript);

        const content = await zip.generateAsync({ type: "blob" });
        
        // Trigger Download
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'toon-character-model.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}
