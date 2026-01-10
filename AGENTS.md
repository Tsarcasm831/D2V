# AGENTS.md

## Project Summary
- D2V is a browser-based 3D RPG ("Frozen Steppes") built on Three.js with a small Node WebSocket server.
- The frontend is native ES modules loaded directly by `index.html` via an import map.
- The backend serves static files and real-time multiplayer snapshots from memory (no DB).


## Requirements
Before you consider a task completed. Make sure to:
- Check all your code for any console errors, warnings, or deprecations.
- Check all your code for any memory leaks.
- Check all your code for any performance issues.
- Check all your code for any accessibility issues.
- Check all your code for any security issues.
- If you've touched a file that is more than 300 lines consider refactoring it.


## Quick Start
- `npm install`
- `npm start` (or `node server.js`)
- Open `http://localhost:3001/`

## Runtime Entry Points
- `index.html`: page shell, import map, and module bootstrapping.
- `src/core/main.js`: UI loading, menus, and loading sequence.
- `src/core/game.js`: scene setup, game loop, and manager wiring.
- `server.js`: static server + WebSocket server.

## Directory Map
- `src/core/`: game bootstrap, loop, asset loading, registry, input.
- `src/world/`: world streaming, shard generation, masks, grid labels, world map, lands.
- `src/entities/`: player, NPCs, fauna, player modules.
- `src/systems/`: weather, time, environment, buildings, build mode, projectiles.
- `src/items/`: equipment and item meshes/attachments.
- `src/ui/`: UI controllers; HTML templates in `ui/` and CSS in `ui/*.css`.
- `data/`: JSON tables (items/buildings/loot/etc) loaded at runtime.
- `assets/`: textures, icons, gear, sounds, and backgrounds.
- `structure.md`, `context.md`: notes/history, not runtime code.

## Multiplayer Protocol
- Client sends: `join`, `input`, `attack`, `placeBuilding`, `chat`.
- Server sends: `welcome`, `snapshot`, `event` (attack/buildingPlaced/chat/playerJoined), `roomFull`, `disconnected`.
- Server uses one in-memory room: `SINGLE_ROOM_CODE = "Alpha"` in `server.js`.

## Controls (from `src/core/input_manager.js`)
- Movement: WASD, Shift (run), Space (jump).
- Combat/build: LMB (attack/place), RMB (rotate/cancel), R (rotate/cast), X (combat toggle).
- UI: Tab/P (inventory), M (map), ] (minimap), ` (options), B (build mode), K (skills), Enter (chat), G (grid), - (resource monitor), F (harvest), C (summon).
- Hotbar/build slots: 1-8.

## Terrain/Grid Conventions
- `SHARD_SIZE = 60` and grid spacing is 5m (`segments = 12`) in `src/world/shard.js`.
- `WorldManager.getTerrainHeight()` bilinear-interpolates `shard.heights` with the same segment count.
- Grid labels use `gridStep = 5.0` in `src/world/grid_labels.js`.
- If you change grid resolution, update `segments`, height interpolation, and label step together.

## Data Conventions
- `Registry` loads `data/*.json` via fetch; `WorldManager` also loads items/loot/plants/stats directly.
- Inventory uses item `type`/`slot` with mappings in `PlayerInventory.getSlotForItem()`.

## External Dependencies / Network
- Browser deps are loaded from `https://esm.sh` (`three`, `nipplejs`, `@google/genai`). Offline dev needs local replacements.
- Optional Gemini key for lore generation: `window.importMetaEnv.GEMINI_API_KEY` or `localStorage.GEMINI_API_KEY`.

## Engine Notes
- World objects and lights use layer 1; camera enables layers 0 and 1 in `src/core/game.js`.
- Use `WorldManager.getSharedMaterial()` and `getSharedGeometry()` to avoid allocations.
- Global instance: `window.gameInstance` is used across UI and world systems.

## Testing
- No automated tests; validate by running the server and exercising gameplay paths in-browser.

## Commit Workflow
- If the user requests a commit message, compare the current repo to the uploaded version by running `git fetch`, then write a new `commit.md` based on the changes.
