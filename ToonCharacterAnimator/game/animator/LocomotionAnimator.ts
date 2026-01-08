
import { PlayerInput } from '../../types';
import { IdleAction } from './actions/IdleAction';
import { MovementAction } from './actions/MovementAction';
import { JumpAction } from './actions/JumpAction';

export class LocomotionAnimator {
    animateIdle(player: any, parts: any, damp: number, skipRightArm: boolean = false) {
        IdleAction.animate(player, parts, damp, skipRightArm);
    }

    animateMovement(player: any, parts: any, dt: number, damp: number, input: PlayerInput, skipRightArm: boolean = false) {
        MovementAction.animate(player, parts, dt, damp, input, skipRightArm);
    }

    animateJump(player: any, parts: any, dt: number, damp: number, input: PlayerInput, skipRightArm: boolean = false) {
        JumpAction.animate(player, parts, dt, damp, input, skipRightArm);
    }
}
