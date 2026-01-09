
import * as THREE from 'three';

export interface TreeData {
    id: string;
    group: THREE.Group;
    trunk: THREE.Mesh;
    leaves: THREE.Mesh;
    health: number;
    shudderTimer: number;
    basePosition: THREE.Vector3;
}

export interface RockData {
    id: string;
    mesh: THREE.Mesh;
    health: number;
    shudderTimer: number;
    basePosition: THREE.Vector3;
}

export interface FallingObject {
    mesh: THREE.Group;
    velocity: number;
    axis: THREE.Vector3;
    angle: number;
}

export interface Debris {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    rotVelocity: THREE.Vector3;
    life: number;
}

export const ENV_CONSTANTS = {
    POND_X: 8,
    POND_Z: 6,
    POND_RADIUS: 4.5,
    POND_DEPTH: 1.8
};
