# Project Structure and Architecture

## 1. Overview
D2V is a web-based 3D RPG built with **Three.js**. It features a procedurally generated world, multiplayer capabilities, and a modular entity system.

## 2. Core Systems

### 2.1 Game Engine (`src/core/`)
- **`main.js`**: Entry point. Handles UI initialization, loading sequences, and the main menu.
- **`game.js`**: The central coordinator. Manages the Three.js scene, camera (Top-down/FPV), lighting, and the main animation loop.
- **`registry.js`**: Singleton for managing data tables (items, buildings, NPCs, etc.) loaded from JSON.
- **`asset_loader.js`**: Handles loading of textures, models, and audio.
- **`input_manager.js`**: Processes keyboard and mouse input, including raycasting for world interaction.

### 2.2 World Management (`src/world/`)
- **`world_manager.js`**: Manages the loading and unloading of world shards, terrain height calculations, and entity caching.
- **`shard.js`**: Represents a chunk of the world. Handles terrain generation, resource spawning (trees, ores), and NPC placement within its bounds.
- **`shard_map.js`**: Manages the macroscopic view of the world and pre-caching.
- **`lands/`**: Contains specific land definitions (e.g., `Land23.js` for the Land of Ghosts) which configure biomes and static spawns.

### 2.3 Entity System (`src/entities/`)
- **`player.js`**: Complex entity managing player physics, animations, gear, and UI state.
- **`npc.js`**: Base class for non-player characters with AI for collision avoidance and dialogue.
- **`humanoid_npc.js`**: Extends NPC for more complex behaviors and appearance.
- **`player_modules/`**: Modularized player logic (stats, gear, actions).
- **`player_animator.js`**: Specialized class for managing skeletal/mesh animations.

### 2.4 Networking (`src/network/`)
- **`GameSocket.js`**: WebSocket wrapper for communication with the game server.
- **`nodempmanager.js`**: Manages multiplayer state, syncing other players' positions and actions.

### 2.5 UI System (`src/ui/` and `ui/`)
- **`ui_loader.js`**: Dynamically loads HTML components into the DOM.
- **`inventory_ui.js`**, **`character_creator.js`**, **`minimap.js`**: Specialized UI controllers.
- **`game_ui.html`**, **`menus.html`**: HTML templates for various game interfaces.

### 2.6 Data (`data/`)
JSON files defining game balance and content:
- `items.json`: Equipment and consumable stats.
- `buildings.json`: Structure definitions.
- `loot_tables.json`: Random drop configurations.
- `npcs.json`: NPC types and default behaviors.

## 3. Data Flow
1. **Init**: `main.js` calls `UILoader.loadAll()` and shows the menu.
2. **Start**: User selects a server; `startLoadingSequence` initializes `Game`.
3. **Loading**: `AssetLoader` and `Registry` load external assets and JSON data.
4. **Loop**: `Game.animate()` runs every frame:
   - Updates input via `InputManager`.
   - Updates world/shards via `WorldManager`.
   - Updates player logic/physics via `Player`.
   - Syncs multiplayer via `NodeMPManager`.
   - Renders scene via `Three.js WebGLRenderer`.

## 4. Key Architectural Patterns
- **Shard-based Streaming**: The world is divided into shards to handle large-scale environments efficiently.
- **Composition over Inheritance**: Especially evident in the `Player` class using modules like `PlayerStats` and `PlayerGear`.
- **Event-driven Networking**: The `GameSocket` handles asynchronous server events and snapshots.
