
export class QuestManager {
    constructor(game) {
        this.game = game;
        this.activeQuests = new Map();
        this.completedQuests = new Set();
        
        // Define Quest Database
        this.questData = {
            'starter_gathering': {
                id: 'starter_gathering',
                title: 'Survival Basics',
                description: 'Collect 10 Wood and 5 Stone to build your first campfire.',
                objectives: [
                    { type: 'collect', item: 'wood', count: 10, current: 0 },
                    { type: 'collect', item: 'stone', count: 5, current: 0 }
                ],
                rewardXP: 100,
                rewardItems: [{ id: 'gold_coin', count: 50 }]
            },
            'hunt_wolves': {
                id: 'hunt_wolves',
                title: 'The Howling Menace',
                description: 'The local wolf population is getting out of hand. Defeat 5 Wolves.',
                objectives: [
                    { type: 'kill', target: 'wolf', count: 5, current: 0 }
                ],
                rewardXP: 250,
                rewardItems: [{ id: 'iron_sword', count: 1 }]
            },
            'titan_slayer': {
                id: 'titan_slayer',
                title: 'The Frozen Colossus',
                description: 'Legend speaks of a titan made of pure ice. Find and defeat the Ice Titan.',
                objectives: [
                    { type: 'kill', target: 'ice_titan', count: 1, current: 0 }
                ],
                rewardXP: 1000,
                rewardItems: [{ id: 'gold_coin', count: 500 }]
            }
        };
    }

    acceptQuest(id) {
        if (this.questData[id] && !this.activeQuests.has(id) && !this.completedQuests.has(id)) {
            const quest = JSON.parse(JSON.stringify(this.questData[id]));
            this.activeQuests.set(id, quest);
            if (this.game.player.ui) {
                this.game.player.ui.showStatus(`QUEST ACCEPTED: ${quest.title}`, false);
            }
            this.updateQuestUI();
        }
    }

    onKill(targetType) {
        this.activeQuests.forEach(quest => {
            quest.objectives.forEach(obj => {
                if (obj.type === 'kill' && obj.target === targetType) {
                    obj.current = Math.min(obj.count, obj.current + 1);
                    this.checkQuestCompletion(quest);
                }
            });
        });
        this.updateQuestUI();
    }

    onCollect(itemType, amount) {
        this.activeQuests.forEach(quest => {
            quest.objectives.forEach(obj => {
                if (obj.type === 'collect' && obj.item === itemType) {
                    obj.current = Math.min(obj.count, obj.current + amount);
                    this.checkQuestCompletion(quest);
                }
            });
        });
        this.updateQuestUI();
    }

    checkQuestCompletion(quest) {
        const allDone = quest.objectives.every(obj => obj.current >= obj.count);
        if (allDone) {
            this.completeQuest(quest.id);
        }
    }

    completeQuest(id) {
        const quest = this.activeQuests.get(id);
        if (quest) {
            this.activeQuests.delete(id);
            this.completedQuests.add(id);
            
            // Apply rewards
            if (this.game.player) {
                this.game.player.addXP(quest.rewardXP);
                quest.rewardItems.forEach(item => {
                    const itemData = this.game.worldManager.itemsData?.items?.[item.id];
                    this.game.player.inventory.addItem({
                        type: item.id,
                        name: itemData?.name || item.id,
                        icon: itemData?.icon || `assets/icons/${item.id}_icon.png`,
                        count: item.count
                    });
                });
            }

            if (this.game.player.ui) {
                this.game.player.ui.showStatus(`QUEST COMPLETED: ${quest.title}`, false);
            }
            
            this.game.achievementManager?.unlock('quest_completionist');
        }
    }

    updateQuestUI() {
        // Implementation for HUD quest tracker update
    }
}
