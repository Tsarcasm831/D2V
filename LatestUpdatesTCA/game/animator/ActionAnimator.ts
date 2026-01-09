
import * as THREE from 'three';
import { ClimbAction } from './actions/ClimbAction';
import { PickupAction } from './actions/PickupAction';
import { WeaponAction } from './actions/WeaponAction';
import { PunchAction } from './actions/PunchAction';
import { InteractAction } from './actions/InteractAction';
import { SkinningAction } from './actions/SkinningAction';
import { FishingAction } from './actions/FishingAction';
import { WaveAction } from './actions/WaveAction';

export class ActionAnimator {
    animateClimb(player: any, parts: any, dt: number, damp: number) {
        ClimbAction.animate(player, parts, dt, damp);
    }

    animatePickup(player: any, parts: any, dt: number, damp: number) {
        PickupAction.animate(player, parts, dt, damp);
    }

    animateSkinning(player: any, parts: any, dt: number, damp: number) {
        SkinningAction.animate(player, parts, dt, damp);
    }

    animateAxeSwing(player: any, parts: any, dt: number, damp: number, isMoving: boolean) {
        WeaponAction.animate(player, parts, dt, damp, isMoving);
    }

    animatePunch(player: any, parts: any, dt: number, damp: number, isMoving: boolean) {
        PunchAction.animate(player, parts, dt, damp, isMoving);
    }

    animateInteract(player: any, parts: any, dt: number, damp: number) {
        InteractAction.animate(player, parts, dt, damp);
    }

    animateFishing(player: any, parts: any, dt: number, damp: number, obstacles?: THREE.Object3D[]) {
        FishingAction.animate(player, parts, dt, damp, obstacles);
    }

    animateWave(player: any, parts: any, dt: number, damp: number) {
        WaveAction.animate(player, parts, dt, damp);
    }
}
