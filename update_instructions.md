# Player Model + Animator Migration Plan (File-by-File)

Goal: replace D2V's current player model/anim stack with the ToonCharacterAnimator (TCA) implementation while keeping existing gameplay flow and UI bindings stable. This plan is ordered and calls out each file to add/replace/modify.

Note: TCA is TypeScript. D2V is native ES modules. Convert all TCA `.ts` to `.js` when copying, or introduce a build step (not recommended for this repo). The plan below assumes direct `.js` conversion.

---

## 0) Baseline mapping

D2V (current) -> TCA (source)
- `src/entities/player.js` -> `ToonCharacterAnimator/game/Player.ts`
- `src/entities/player_animator.js` + `src/entities/model/PlayerAnimator.js` -> `ToonCharacterAnimator/game/PlayerAnimator.ts`
- `src/entities/model/PlayerModel.js` -> `ToonCharacterAnimator/game/PlayerModel.ts`
- `src/entities/model/PlayerMaterials.js` -> `ToonCharacterAnimator/game/model/PlayerMaterials.ts`
- `src/entities/model/mesh/*` -> `ToonCharacterAnimator/game/model/mesh/*`
- `src/entities/animator/*` -> `ToonCharacterAnimator/game/animator/*`
- `src/entities/player/PlayerPhysics.js` -> `ToonCharacterAnimator/game/player/PlayerPhysics.ts`
- `src/data/constants.js` -> `ToonCharacterAnimator/data/constants.ts`
- `src/ui/character_creator.js` + `ui/character_creator.html` -> fields in `ToonCharacterAnimator/components/ui/controls/*` and `types.ts`

---

## 1) Add new model infrastructure files (TCA managers)

Create JS equivalents in `src/entities/model/`:
- Add `src/entities/model/PlayerPartsRegistry.js` from `ToonCharacterAnimator/game/model/PlayerPartsRegistry.ts`.
- Add `src/entities/model/PlayerBodyScaler.js` from `ToonCharacterAnimator/game/model/PlayerBodyScaler.ts`.
- Add `src/entities/model/PlayerClothingManager.js` from `ToonCharacterAnimator/game/model/PlayerClothingManager.ts`.
- Add `src/entities/model/PlayerHairManager.js` from `ToonCharacterAnimator/game/model/PlayerHairManager.ts`.
- Add `src/entities/model/PlayerDebugManager.js` from `ToonCharacterAnimator/game/model/PlayerDebugManager.ts`.

Conversion notes:
- Remove TS types, use JS class syntax.
- Keep imports as ES module paths relative to `src/entities/model/`.
- Use existing THREE import (`import * as THREE from 'three';`).

---

## 2) Replace PlayerModel pipeline

Update `src/entities/model/PlayerModel.js`:
- Replace contents with the logic from `ToonCharacterAnimator/game/PlayerModel.ts`.
- Wire in the new managers (registry, clothing, hair, scaler, debug).
- Expose `eyes`, `eyelids`, `rightFingers`, `leftFingers`, `rightThumb`, `leftThumb` getters.
- Ensure `sync(config, isCombatStance)` calls:
  - `materials.sync(config)`
  - `debug.update(config.debugHead)`
  - `scaler.sync(config, isCombatStance)`
  - `updateEquipment`, `updateHeldItem`
  - `clothing.update(config)`
  - `hair.updateConfig(config)` + `hair.syncColor(config.hairColor)`
- Ensure `update(dt, velocity)` uses `hair.updatePhysics(dt, velocity)`.

---

## 3) Replace mesh builders

Update or replace files in `src/entities/model/mesh/` with TCA versions:
- Replace `HeadBuilder.js` with `ToonCharacterAnimator/game/model/mesh/HeadBuilder.ts`.
- Replace `TorsoBuilder.js` with `ToonCharacterAnimator/game/model/mesh/TorsoBuilder.ts`.
- Replace `FootBuilder.js` with `ToonCharacterAnimator/game/model/mesh/FootBuilder.ts`.
- Replace `HandBuilder.js` with `ToonCharacterAnimator/game/model/mesh/HandBuilder.ts`.
- Replace `PlayerMeshBuilder.js` with `ToonCharacterAnimator/game/model/PlayerMeshBuilder.ts`.
- Add `ShoeBuilder.js` from `ToonCharacterAnimator/game/model/mesh/ShoeBuilder.ts`.
- Update `MeshUtils.js` if TCA has changes in `ToonCharacterAnimator/game/model/mesh/MeshUtils.ts`.

Important: TCA `PlayerMeshBuilder` expects a `config` argument for shoe selection; update call sites accordingly.

---

## 4) Replace materials + equipment

### Materials
Update `src/entities/model/PlayerMaterials.js`:
- Replace with `ToonCharacterAnimator/game/model/PlayerMaterials.ts`.
- Keep `applyOutfit` as a no-op or compatibility shim (TCA uses `sync(config)` instead).

### Equipment
Update `src/entities/model/PlayerEquipment.js`:
- Replace with `ToonCharacterAnimator/game/model/PlayerEquipment.ts`.
- Ensure equipment builders exist in D2V:
  - Add `src/entities/model/equipment/AxeBuilder.js`, `SwordBuilder.js`, `PickaxeBuilder.js`, `KnifeBuilder.js`, `FishingPoleBuilder.js` (from TCA `game/model/equipment/*`).
- Update item name mapping if D2V uses different item IDs (e.g., `axe`, `sword`); add a mapping layer if needed.

---

## 5) Replace animator stack (locomotion + actions + status)

Replace D2V animator files with TCA versions:
- Replace `src/entities/model/PlayerAnimator.js` with `ToonCharacterAnimator/game/PlayerAnimator.ts`.
- Replace `src/entities/animator/LocomotionAnimator.js` with `ToonCharacterAnimator/game/animator/LocomotionAnimator.ts`.
- Replace `src/entities/animator/ActionAnimator.js` with `ToonCharacterAnimator/game/animator/ActionAnimator.ts`.
- Replace `src/entities/animator/StatusAnimator.js` with `ToonCharacterAnimator/game/animator/StatusAnimator.ts`.
- Replace or add action files in `src/entities/animator/actions/` using:
  - `IdleAction`, `MovementAction`, `JumpAction`, `PunchAction`, `WeaponAction`, `InteractAction`, `PickupAction`, `ClimbAction`, `SkinningAction`, `FishingAction`, `CreepySmileAction` (as needed).

Update `src/entities/animator/AnimationUtils.js`:
- Add/merge TCA helpers: `applyFootRot`, `animateBreathing`, `playerModelResetFeet`.
- Ensure foot rotation uses heel/forefoot names TCA builders produce.

---

## 6) Update player wrapper + state

Update `src/entities/player.js` using `ToonCharacterAnimator/game/Player.ts` as reference:
- Keep D2V gameplay systems (stats, inventory, UI, actions) but align state names/flags to TCA expectations:
  - add `isFishing`, `fishingTimer`, `weaponStance`, `debugHead`.
  - ensure `isCombatStance` toggles similar to TCA (may map to existing `actions.isCombat`).
- Replace animator call to use new `PlayerAnimator` directly (no extra wrapper in `src/entities/player_animator.js` unless you want compatibility glue).
- If keeping `src/entities/player_animator.js`, update it to a thin proxy that just forwards state to the new animator.

---

## 7) Update player physics

Update `src/entities/player/PlayerPhysics.js` to match `ToonCharacterAnimator/game/player/PlayerPhysics.ts`:
- Add shoes ground offset (when `config.equipment.shoes` is true).
- Keep existing weather/foliage speed modifiers if desired, but ensure movement vector logic matches TCA stride expectations.
- Ensure ledge grab logic stays in sync with animator climb.

---

## 8) Config + presets + data

Update `src/data/constants.js`:
- Merge TCA `BODY_PRESETS` and `OUTFIT_PRESETS` from `ToonCharacterAnimator/data/constants.ts`.
- Add any missing config fields with defaults (toe/hand/abs/bulge, `pantsColor`, `shirtColor2`, `weaponStance`, `debugHead`, `shoes`).

Update `src/entities/player.js` default `config` initialization:
- Ensure all TCA config fields exist with defaults from `ToonCharacterAnimator/types.ts`.
- If you keep legacy fields (e.g., `torsoColor`), decide how they map into TCA’s materials.

---

## 9) Character creator + UI wiring

Update `src/ui/character_creator.js` + `ui/character_creator.html`:
- Add controls for any new fields you want exposed (shoes, pantsColor, shirtColor2, bulge/abs/toe/thumb fields, debugHead).
- Ensure save/load includes new fields with fallback defaults.

Optional: mirror TCA UI controls (`ToonCharacterAnimator/components/ui/controls/*`) for layouts and field coverage.

---

## 10) Clean-up and compatibility checks

- Remove unused D2V model/anim files if fully replaced:
  - `src/entities/model/PlayerAnimator.js` (if superseded),
  - old action animators if not used.
- Verify equipment mounts exist: `rightHandMount`, `leftShieldMount`, `right/leftShoulderMount`.
- Verify foot anchors are named `*_foot_anchor`, `*_heel`, `*_forefoot`.

---

## 11) Validation checklist

- Spawn player and verify:
  - Idle, walk, run, strafe, jump.
  - Combat stance idle and movement.
  - Action animations: punch, axe swing, interact, pickup, skinning, climbing, fishing.
  - Equipment attaches correctly to right hand and left shield mount.
  - Clothing toggles (shirt/pants/shoes) and colors apply correctly.
  - Hair physics responds to movement.
  - Debug head toggle works (if enabled).

---

## 12) Suggested migration order (smallest risk first)

1) Add new model files + mesh builders.
2) Replace `PlayerModel.js` and `PlayerMaterials.js`.
3) Swap animator stack (locomotion/actions/status).
4) Update player wrapper + physics.
5) Expand config/presets/UI.

---

## 13) Notes on specific deltas

- TCA introduces `shoes` equipment and a `ShoeBuilder`. D2V currently does not have shoes. Decide whether to expose shoes in inventory/gear or default off.
- TCA uses `shirtColor2` for multi-tone shirts. D2V materials currently only support a single shirt color.
- TCA includes abs/bulge/toe/thumb rig controls. You can keep them internal (defaults only) if UI scope is too large.
- TCA uses `weaponStance` to adjust arm pose when holding items (`side` vs `shoulder`). Map to existing D2V gear usage if needed.

