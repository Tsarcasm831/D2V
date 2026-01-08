import * as THREE from 'three';

export class TorsoBuilder {
    static build(materials, arrays) {
        const hips = new THREE.Group();
        hips.position.y = 1.0;

        const torsoLen = 0.56;
        const torsoContainer = new THREE.Group();
        hips.add(torsoContainer);

        const torsoRadiusTop = 0.28;
        const torsoRadiusBottom = 0.22;
        const torsoMat = materials.torso || materials.shirt;
        
        // Torso Body
        const torsoGeo = new THREE.CylinderGeometry(torsoRadiusTop, torsoRadiusBottom, torsoLen, 16);
        torsoGeo.scale(1, 1, 0.65);
        const torso = new THREE.Mesh(torsoGeo, torsoMat);
        torso.position.y = torsoLen / 2 + 0.1;
        torso.castShadow = true;
        torsoContainer.add(torso);

        // Shoulders
        const shoulderGeo = new THREE.SphereGeometry(torsoRadiusTop * 1.05, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
        shoulderGeo.scale(1, 0.5, 0.65);
        const topCap = new THREE.Mesh(shoulderGeo, torsoMat);
        topCap.position.y = torsoLen / 2;
        torso.add(topCap);

        // Neck Base
        const neckBase = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 0.08, 12), materials.skin);
        neckBase.position.y = torsoLen / 2 + 0.06;
        neckBase.scale.set(1, 1, 0.8);
        torso.add(neckBase);

        // Traps
        const trapHeight = 0.18;
        const trapGeo = new THREE.CylinderGeometry(0.06, 0.12, trapHeight, 8);
        trapGeo.translate(0, -trapHeight / 2, 0);
        
        const createTrap = (isLeft) => {
            const side = isLeft ? 1 : -1;
            const trap = new THREE.Mesh(trapGeo, materials.skin);
            trap.position.set(side * 0.06, torsoLen / 2 + 0.08, 0.02);
            trap.rotation.z = side * -1.1;
            trap.rotation.x = 0.1;
            trap.scale.set(1, 1, 0.7);
            return trap;
        };
        torso.add(createTrap(true));
        torso.add(createTrap(false));

        // Pelvis
        const pelvis = new THREE.Group();
        pelvis.position.y = -torsoLen / 2;
        torso.add(pelvis);
        
        const pelvisHeight = 0.14;
        const pelvisGeo = new THREE.CylinderGeometry(torsoRadiusBottom * 0.95, torsoRadiusBottom * 0.55, pelvisHeight, 16);
        pelvisGeo.scale(1, 1, 0.7);
        const pelvisMesh = new THREE.Mesh(pelvisGeo, materials.pants);
        pelvisMesh.position.y = -pelvisHeight / 2;
        pelvis.add(pelvisMesh);

        const crotchGeo = new THREE.SphereGeometry(torsoRadiusBottom * 0.55, 16, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
        crotchGeo.scale(1, 0.7, 0.7);
        const crotchMesh = new THREE.Mesh(crotchGeo, materials.pants);
        crotchMesh.position.y = -pelvisHeight;
        pelvis.add(crotchMesh);
        
        // Underwear
        const underwearBottom = new THREE.Group();
        pelvis.add(underwearBottom);
        const uPelvis = new THREE.Mesh(pelvisGeo, materials.underwear);
        uPelvis.scale.set(1.02, 1.02, 1.02);
        uPelvis.position.y = -pelvisHeight / 2;
        underwearBottom.add(uPelvis);
        const uCrotch = new THREE.Mesh(crotchGeo, materials.underwear);
        uCrotch.scale.set(1.02, 1.02, 1.02);
        uCrotch.position.y = -pelvisHeight;
        underwearBottom.add(uCrotch);

        // Buttocks
        const buttocks = new THREE.Group();
        pelvis.add(buttocks);
        const buttRadius = 0.125;
        const buttGeo = new THREE.SphereGeometry(buttRadius, 16, 16);
        const undieGeo = new THREE.SphereGeometry(buttRadius * 1.04, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.65);

        [-1, 1].forEach(side => {
            const cheekGroup = new THREE.Group();
            cheekGroup.position.set(side * 0.075, -0.06, -0.11);
            cheekGroup.rotation.x = 0.2;
            cheekGroup.rotation.y = side * 0.25;
            buttocks.add(cheekGroup);

            const cheek = new THREE.Mesh(buttGeo, materials.skin);
            cheek.scale.set(1, 0.95, 0.85);
            cheekGroup.add(cheek);
            arrays.buttockCheeks.push(cheek);

            const undie = new THREE.Mesh(undieGeo, materials.underwear);
            undie.name = 'undie';
            undie.scale.set(1, 0.95, 0.85);
            undie.rotation.z = side * 0.7;
            undie.rotation.x = 0.2;
            cheekGroup.add(undie);
        });

        // Female Chest
        const chest = new THREE.Group();
        chest.visible = false;
        chest.position.set(0, 0.15, 0.12);
        torso.add(chest);
        const breastGeo = new THREE.SphereGeometry(0.13, 16, 16);
        const nippleGeoFem = new THREE.CircleGeometry(0.012, 8);
        const braCups = [];

        [-0.11, 0.11].forEach(x => {
            const b = new THREE.Mesh(breastGeo, torsoMat);
            b.position.x = x;
            b.scale.set(1, 0.9, 0.6);
            b.rotation.y = (x > 0 ? 1 : -1) * 0.15;
            b.castShadow = true;
            
            const cup = new THREE.Mesh(breastGeo, materials.underwear);
            cup.scale.set(1.03, 1.03, 1.03);
            b.add(cup);
            braCups.push(cup);

            const n = new THREE.Mesh(nippleGeoFem, materials.lip);
            n.position.set(0, 0, 0.13);
            b.add(n);
            chest.add(b);
        });

        const strapGeo = new THREE.CylinderGeometry(0.27, 0.26, 0.05, 16);
        strapGeo.scale(1, 1, 0.65);
        const braStrap = new THREE.Mesh(strapGeo, materials.underwear);
        braStrap.position.y = 0.15;
        braStrap.scale.set(1.02, 1, 1.02);
        torso.add(braStrap);

        // Male Chest
        const maleChest = new THREE.Group();
        maleChest.visible = true;
        torso.add(maleChest);
        const nippleGeo = new THREE.CircleGeometry(0.012, 8);
        [-1, 1].forEach(side => {
            const n = new THREE.Mesh(nippleGeo, materials.lip);
            n.position.set(side * 0.12, 0.17, 0.16);
            n.rotation.y = side * 0.4;
            n.rotation.x = -0.05;
            maleChest.add(n);
        });

        const abGeo = new THREE.SphereGeometry(0.05, 8, 8);
        const abRows = [
            { y: 0.02, z: 0.160 },
            { y: -0.07, z: 0.151 },
            { y: -0.16, z: 0.144 }
        ];
        abRows.forEach((row) => {
            for (let side of [-1, 1]) {
                const ab = new THREE.Mesh(abGeo, materials.skin);
                ab.scale.set(1.2, 0.8, 0.3);
                ab.position.set(side * 0.055, row.y, row.z);
                ab.rotation.y = side * 0.15;
                ab.rotation.x = -0.05;
                maleChest.add(ab);
            }
        });

        const neckRadius = 0.11;
        const neckHeight = 0.24;
        const neck = new THREE.Mesh(new THREE.CapsuleGeometry(neckRadius, neckHeight, 4, 8), materials.skin);
        neck.position.y = torsoLen + 0.24;
        neck.castShadow = true;
        torsoContainer.add(neck);

        return {
            hips,
            torsoContainer,
            torso,
            topCap,
            neckBase,
            pelvis,
            underwearBottom,
            buttocks,
            chest,
            braCups,
            braStrap,
            maleChest,
            neck
        };
    }
}
