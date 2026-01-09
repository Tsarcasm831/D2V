
export class AchievementManager {
    constructor(game) {
        this.game = game;
        this.achievements = {
            'first_kill': { name: 'First Blood', description: 'Defeat your first enemy', completed: false },
            'bear_hunter': { name: 'Bear Hunter', description: 'Defeat a Bear', completed: false },
            'wolf_slayer': { name: 'Wolf Slayer', description: 'Defeat a Wolf', completed: false },
            'explorer': { name: 'Explorer', description: 'Discover 3 locations', completed: false },
            'weak_point_master': { name: 'Precise Strike', description: 'Hit an enemy weak point', completed: false }
        };
        this.load();
    }

    unlock(id) {
        if (this.achievements[id] && !this.achievements[id].completed) {
            this.achievements[id].completed = true;
            this.showNotification(this.achievements[id]);
            this.save();
        }
    }

    showNotification(achievement) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            border: 2px solid #fbbf24;
            color: white;
            padding: 15px;
            border-radius: 8px;
            z-index: 9999;
            animation: slideIn 0.5s ease-out;
            font-family: 'Cinzel', serif;
        `;
        notification.innerHTML = `
            <div style="color: #fbbf24; font-weight: bold; margin-bottom: 5px;">ACHIEVEMENT UNLOCKED</div>
            <div style="font-size: 1.1em;">${achievement.name}</div>
            <div style="font-size: 0.8em; opacity: 0.8;">${achievement.description}</div>
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.5s ease-in';
            setTimeout(() => notification.remove(), 500);
        }, 4000);
    }

    save() {
        const completed = Object.keys(this.achievements).filter(id => this.achievements[id].completed);
        localStorage.setItem('frozen_steppes_achievements', JSON.stringify(completed));
    }

    load() {
        const saved = JSON.parse(localStorage.getItem('frozen_steppes_achievements') || '[]');
        saved.forEach(id => {
            if (this.achievements[id]) this.achievements[id].completed = true;
        });
    }
}
