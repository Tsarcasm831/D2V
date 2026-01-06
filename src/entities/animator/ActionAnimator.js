import { ClimbAction } from './actions/ClimbAction.js';
import { PickupAction } from './actions/PickupAction.js';
import { WeaponAction } from './actions/WeaponAction.js';
import { PunchAction } from './actions/PunchAction.js';
import { InteractAction } from './actions/InteractAction.js';
import { SkinningAction } from './actions/SkinningAction.js';

export class ActionAnimator {
    animateClimb(player, parts, dt, damp) {
        ClimbAction.animate(player, parts, dt, damp);
    }

    animatePickup(player, parts, dt, damp) {
        PickupAction.animate(player, parts, dt, damp);
    }

    animateSkinning(player, parts, dt, damp) {
        SkinningAction.animate(player, parts, dt, damp);
    }

    animateAxeSwing(player, parts, dt, damp) {
        WeaponAction.animate(player, parts, dt, damp);
    }

    animatePunch(player, parts, dt, damp) {
        PunchAction.animate(player, parts, dt, damp);
    }

    animateInteract(player, parts, dt, damp) {
        InteractAction.animate(player, parts, dt, damp);
    }
}
