import { ClimbAction } from './actions/ClimbAction';
import { PickupAction } from './actions/PickupAction';
import { WeaponAction } from './actions/WeaponAction';
import { PunchAction } from './actions/PunchAction';
import { InteractAction } from './actions/InteractAction';
import { SkinningAction } from './actions/SkinningAction';

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

    animateAxeSwing(player: any, parts: any, dt: number, damp: number) {
        WeaponAction.animate(player, parts, dt, damp);
    }

    animatePunch(player: any, parts: any, dt: number, damp: number) {
        PunchAction.animate(player, parts, dt, damp);
    }

    animateInteract(player: any, parts: any, dt: number, damp: number) {
        InteractAction.animate(player, parts, dt, damp);
    }
}