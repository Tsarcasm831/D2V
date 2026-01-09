Top 10 Files Needing Refactoring
1. server.js (~577 lines)
Issues: Monolithic file handling multiple concerns

HTTP server, WebSocket server, ESM proxy, rate limiting, and game logic all mixed
Complex connection handling with nested functions
Multiple responsibilities violates Single Responsibility Principle
2. src/core/game.js (~665 lines)
Issues: Massive God object with too many responsibilities

Scene management, player control, camera systems, UI, networking, spawning
Long methods with complex logic (animate() method is 90+ lines)
Direct DOM manipulation mixed with game logic
3. src/entities/player_stubs.js (~721 lines)
Issues: Still a temporary catch‑all file containing multiple UI classes

PlayerInventory, CraftingMenu, ConversationUI, PlayerInventoryUI all in one file
Each class should be in separate files
Complex inventory logic mixed with UI logic
4. src/world/world_manager.js (~951 lines)
Issues: Complex world management with multiple concerns

Terrain generation, entity management, caching, loading, data management
Long methods with complex logic
Multiple caching strategies mixed together
5. src/entities/player.js (~524 lines)
Issues: Still sizable despite partial module extraction under src/entities/player/

Initialization/state, physics hooks, animation binding, and UI wiring remain intertwined
Some responsibilities (combat/physics/actions) are split out, but core class still coordinates many concerns
6. src/core/input_manager.js (366 lines)
Issues: Complex input handling with nested conditionals

Multiple input modes (keyboard, mouse, touch) mixed
UI state checking scattered throughout
Long setupControls() method with many nested conditions
7. src/entities/model/PlayerModel.js (~352 lines)
Issues: Complex model management with multiple responsibilities

Mesh building, equipment handling, physics updates all mixed
Tight coupling between different model systems
Complex update logic
8. src/entities/animator/LocomotionAnimator.js
Issues: Complex animation system with hardcoded values

Long methods with complex state machines
Magic numbers and hardcoded animations
Tight coupling to specific animation types
9. src/network/nodempmanager.js
Issues: Network management with mixed concerns

Connection handling, message processing, state synchronization
Complex update logic with timing issues
Error handling scattered throughout
10. src/world/shard.js
Issues: Complex terrain generation with multiple systems

Heightmap generation, resource spawning, building placement
Long methods with nested loops
Performance optimizations mixed with core logic
Key Refactoring Patterns Needed
Extract Classes: Break large classes into focused, single-responsibility classes
Separate Concerns: Split UI logic from game logic, networking from game state
Extract Methods: Break long methods into smaller, focused functions
Remove Duplication: Consolidate similar patterns across files
Dependency Injection: Reduce tight coupling between systems
Configuration Objects: Replace hardcoded values with configurable parameters