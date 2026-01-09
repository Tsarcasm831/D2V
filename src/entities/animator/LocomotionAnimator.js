import { IdleAction } from './actions/IdleAction.js';
import { MovementAction } from './actions/MovementAction.js';
import { JumpAction } from './actions/JumpAction.js';

export class LocomotionAnimator {
    animateIdle(player, parts, damp, skipRightArm = false) {
        IdleAction.animate(player, parts, damp, skipRightArm);
    }

    animateMovement(player, parts, dt, damp, input, skipRightArm = false) {
        MovementAction.animate(player, parts, dt, damp, input, skipRightArm);
    }

    animateJump(player, parts, dt, damp, input, skipRightArm = false) {
        JumpAction.animate(player, parts, dt, damp, input, skipRightArm);
    }
}
