import { PlayerInput } from '../types';
import { LocomotionAnimator } from './animator/LocomotionAnimator';
import { ActionAnimator } from './animator/ActionAnimator';
import { StatusAnimator } from './animator/StatusAnimator';

export class PlayerAnimator {
    private locomotion = new LocomotionAnimator();
    private action = new ActionAnimator();
    private status = new StatusAnimator();

    animate(player: any, dt: number, isMoving: boolean, input: PlayerInput) {
        const parts = player.model.parts;
        const damp = 10 * dt;

        if (player.isDragged || player.recoverTimer > 0) {
            this.status.animateRagdoll(player, parts, dt);
        } else if (player.isDead) {
            this.status.animateDeath(player, parts, dt, damp);
        } else if (player.isLedgeGrabbing) {
            this.action.animateClimb(player, parts, dt, damp);
        } else if (player.isAxeSwing) {
            this.action.animateAxeSwing(player, parts, dt, damp);
        } else if (player.isPunch) {
            this.action.animatePunch(player, parts, dt, damp);
        } else if (player.isInteracting) {
            this.action.animateInteract(player, parts, dt, damp);
        } else if (player.isPickingUp) {
            this.action.animatePickup(player, parts, dt, damp);
        } else if (player.isJumping) {
            this.locomotion.animateJump(player, parts, dt, damp, input);
        } else if (isMoving) {
            this.locomotion.animateMovement(player, parts, dt, damp, input);
        } else {
            this.locomotion.animateIdle(player, parts, damp);
        }
    }
}
