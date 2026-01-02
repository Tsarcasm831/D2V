/**
 * Data Registry for managing game data from JSON tables.
 */
class Registry {
  constructor() {
    this.data = {
      items: {},
      buildings: {},
      loot_tables: {},
      quests: {},
      plants: {},
      npcs: {},
      stats: {},
      equipment_slots: {},
      world_gen: {}
    };
    this.isLoaded = false;
  }

  /**
   * Loads all JSON data files.
   * @returns {Promise<void>}
   */
  async loadAll() {
    const files = [
      'items', 'buildings', 'loot_tables', 'quests', 
      'plants', 'npcs', 'stats', 'equipment_slots', 'world_gen'
    ];

    try {
      const loadPromises = files.map(async (file) => {
        const response = await fetch(`./data/${file}.json`);
        if (!response.ok) throw new Error(`Failed to load ${file}.json`);
        const json = await response.json();
        
        // Handle files that have a root key (like "items": {...}) or just raw data
        this.data[file] = json[file] || json;
      });

      await Promise.all(loadPromises);
      this.isLoaded = true;
      console.log('Registry: All data tables loaded successfully.');
    } catch (error) {
      console.error('Registry: Error loading data tables:', error);
      throw error;
    }
  }

  // Lookups
  getItem(id) {
    return this.data.items[id] || null;
  }

  getBuilding(id) {
    return this.data.buildings[id] || null;
  }

  getLootTable(id) {
    return this.data.loot_tables[id] || null;
  }

  getQuest(id) {
    return this.data.quests[id] || null;
  }

  getPlant(id) {
    return this.data.plants[id] || null;
  }

  getNPC(id) {
    return this.data.npcs[id] || null;
  }

  getStatDefinition(id) {
    return this.data.stats.definitions?.[id] || null;
  }

  getStatFormula(id) {
    return this.data.stats.formulas?.[id] || null;
  }

  getEquipmentSlot(id) {
    return this.data.equipment_slots.slots?.[id] || null;
  }

  getWorldGen() {
    return this.data.world_gen;
  }
}

// Export a singleton instance
export const registry = new Registry();
