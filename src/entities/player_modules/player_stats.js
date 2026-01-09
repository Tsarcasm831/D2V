
export class PlayerStats {
    constructor(player) {
        this.player = player;
        
        this.base = {
            strength: 5,
            dexterity: 5,
            intelligence: 5,
            vitality: 5
        };
        
        this.derived = {
            damage: 0,
            defense: 0,
            dodge: 0,
            attackSpeed: 1.0,
            maxHealth: 100,
            maxChakra: 100,
            critChance: 0
        };

        this.level = 1;
        this.xp = 0;
        this.xpToNextLevel = 100;

        this.maxHealth = 100;
        this.health = 100;

        this.maxStamina = 100;
        this.stamina = 100;
        this.staminaDrainPerSec = 22;
        this.staminaRegenPerSec = 16;

        this.maxChakra = 100;
        this.chakra = 100;
        this.chakraRegenPerSec = 5;
    }

    addXP(amount) {
        this.xp += amount;
        console.log(`Player gained ${amount} XP. Total: ${this.xp}/${this.xpToNextLevel}`);

        while (this.xp >= this.xpToNextLevel) {
            this.levelUp();
        }

        if (this.player.ui) this.player.ui.updateHud();
    }

    levelUp() {
        this.xp -= this.xpToNextLevel;
        this.level++;
        this.xpToNextLevel = Math.floor(100 * Math.pow(1.2, this.level - 1));
        
        // Increase base stats on level up
        this.base.vitality += 1;
        this.base.strength += 1;
        this.base.dexterity += 1;
        this.base.intelligence += 1;
        
        this.recalculate();
        
        // Fully heal on level up
        this.health = this.maxHealth;
        this.chakra = this.maxChakra;

        if (this.player.ui) {
            this.player.ui.showStatus(`Level Up! You are now level ${this.level}`, false);
            this.player.ui.updateHud();
        }
        console.log(`Leveled up to ${this.level}! Next level at ${this.xpToNextLevel} XP.`);
    }

    recalculate() {
        if (!this.player.inventory) return;

        // Base values from gear
        const gearStats = {
            maxHealth: 0,
            maxChakra: 0,
            damage: 0,
            defense: 0,
            dodge: 0,
            attackSpeedMult: 0,
            critChance: 0
        };

        // Sum up stats from equipped items
        if (this.player.inventory && this.player.inventory.equipment) {
            Object.values(this.player.inventory.equipment).forEach(item => {
            if (item && item.stats) {
                if (item.stats.health) gearStats.maxHealth += item.stats.health;
                if (item.stats.maxHealth) gearStats.maxHealth += item.stats.maxHealth;
                if (item.stats.chakra) gearStats.maxChakra += item.stats.chakra;
                if (item.stats.maxChakra) gearStats.maxChakra += item.stats.maxChakra;
                if (item.stats.damage) gearStats.damage += item.stats.damage;
                if (item.stats.defense) gearStats.defense += item.stats.defense;
                if (item.stats.dodge) gearStats.dodge += item.stats.dodge;
                if (item.stats.attackSpeed) gearStats.attackSpeedMult += (item.stats.attackSpeed - 1.0);
                if (item.stats.critChance) gearStats.critChance += item.stats.critChance;
            }
        });
        }

        // Current active weapon stats
        const activeItem = this.player.inventory.hotbar[this.player.inventory.selectedSlot];
        let weaponBaseDamage = 0;
        if (activeItem && activeItem.stats && activeItem.stats.damage) {
            weaponBaseDamage = activeItem.stats.damage;
        }

        // Apply formulas
        this.derived.maxHealth = 100 + (this.base.vitality * 10) + gearStats.maxHealth;
        this.derived.maxChakra = 100 + (this.base.intelligence * 10) + gearStats.maxChakra;
        this.derived.damage = (weaponBaseDamage + (this.base.strength * 2)) + gearStats.damage;
        this.derived.defense = gearStats.defense;
        this.derived.dodge = (this.base.dexterity * 0.01) + gearStats.dodge;
        this.derived.attackSpeed = 1.0 + (this.base.dexterity * 0.05) + gearStats.attackSpeedMult;
        this.derived.critChance = gearStats.critChance;

        // Update current maxes
        const healthRatio = this.health / (this.maxHealth || 1);
        const chakraRatio = this.chakra / (this.maxChakra || 1);

        this.maxHealth = this.derived.maxHealth;
        this.maxChakra = this.derived.maxChakra;

        // Heal/Adjust current values
        this.health = Math.min(this.maxHealth, this.maxHealth * healthRatio);
        this.chakra = Math.min(this.maxChakra, this.maxChakra * chakraRatio);

        if (this.player.ui) this.player.ui.updateHud();
    }
}
