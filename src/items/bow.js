import * as THREE from 'three';
import { SCALE_FACTOR } from '../world/world_bounds.js';

function createCylinderBetween(p0, p1, r0, r1, material, radialSegments = 10) {
    const dir = new THREE.Vector3().subVectors(p1, p0);
    const len = dir.length();
    if (len === 0) return null;

    const geom = new THREE.CylinderGeometry(r1, r0, len, radialSegments, 1, true);
    const mesh = new THREE.Mesh(geom, material);

    const mid = new THREE.Vector3().addVectors(p0, p1).multiplyScalar(0.5);
    mesh.position.copy(mid);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    return mesh;
}

export function createBow() {
    const group = new THREE.Group();
    const SCALE = SCALE_FACTOR;

    // Materials
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x4a2f22, roughness: 0.85 });
    const wrapMat = new THREE.MeshStandardMaterial({ color: 0x6d4c41, roughness: 0.6 });
    const nockMat = new THREE.MeshStandardMaterial({ color: 0x2d201a, roughness: 0.5, metalness: 0.1 });
    const stringMat = new THREE.MeshBasicMaterial({ color: 0xf5f5f5 });

    const limbLength = 0.65 * SCALE;
    const baseRadius = 0.03 * SCALE;
    const tipRadius = 0.012 * SCALE;

    // Build each limb from tapered segments along a curve
    function buildLimb(sign = 1) {
        const limb = new THREE.Group();
        const points = [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0.045 * SCALE, 0.28 * limbLength, 0),
            new THREE.Vector3(0.03 * SCALE, 0.62 * limbLength, 0),
            new THREE.Vector3(0.0, limbLength, 0)
        ].map(v => new THREE.Vector3(v.x, v.y * sign, v.z));

        const curve = new THREE.CatmullRomCurve3(points);
        const segments = 12;
        const curvePoints = curve.getPoints(segments);

        for (let i = 0; i < segments; i++) {
            const p0 = curvePoints[i];
            const p1 = curvePoints[i + 1];
            const t0 = i / segments;
            const t1 = (i + 1) / segments;
            const r0 = THREE.MathUtils.lerp(baseRadius, tipRadius, t0 * 0.85);
            const r1 = THREE.MathUtils.lerp(baseRadius, tipRadius, t1 * 0.85);
            const segMesh = createCylinderBetween(p0, p1, r0, r1, woodMat, 12);
            if (segMesh) limb.add(segMesh);
        }

        // Nock at the tip
        const tip = curvePoints[curvePoints.length - 1];
        const tipDir = new THREE.Vector3().subVectors(tip, curvePoints[curvePoints.length - 2]).normalize();
        const nock = new THREE.Mesh(
            new THREE.ConeGeometry(tipRadius * 1.4, tipRadius * 2.6, 6),
            nockMat
        );
        nock.position.copy(tip);
        nock.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tipDir);
        limb.add(nock);

        return { limb, tip };
    }

    const { limb: upperLimb, tip: upperTip } = buildLimb(1);
    const { limb: lowerLimb, tip: lowerTip } = buildLimb(-1);
    group.add(upperLimb);
    group.add(lowerLimb);

    // 2. Grip and wrap
    const grip = new THREE.Mesh(
        new THREE.CylinderGeometry(0.028 * SCALE, 0.028 * SCALE, 0.16 * SCALE, 14, 1, true),
        wrapMat
    );
    // Pull the grip forward so the hand is away from the string
    grip.position.x = 0.04 * SCALE;
    group.add(grip);

    const wrapBand = new THREE.Mesh(
        new THREE.CylinderGeometry(0.031 * SCALE, 0.031 * SCALE, 0.08 * SCALE, 12, 1, true),
        wrapMat.clone()
    );
    wrapBand.material.color.offsetHSL(0, 0, -0.05);
    wrapBand.position.x = 0.042 * SCALE;
    group.add(wrapBand);

    // 3. Bow string anchored at the nocks
    const topAnchor = upperTip.clone().add(new THREE.Vector3(-0.018 * SCALE, 0, 0));
    const bottomAnchor = lowerTip.clone().add(new THREE.Vector3(-0.018 * SCALE, 0, 0));
    const stringMesh = createCylinderBetween(bottomAnchor, topAnchor, 0.0045 * SCALE, 0.0045 * SCALE, stringMat, 8);
    if (stringMesh) group.add(stringMesh);

    // Orient the bow correctly for the hand
    group.rotation.z = Math.PI / 2;
    group.rotation.y = Math.PI / 2;

    return group;
}

export function attachBow(parts) {
    const bow = createBow();
    // Position bow in the left hand by default
    if (parts.leftHand) {
        parts.leftHand.add(bow);
    }
    return bow;
}
