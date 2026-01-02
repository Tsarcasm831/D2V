export class TimeManager {
    constructor(game) {
        this.game = game;
        this.timeOfDay = 8.0; // Start at 8 AM
        this.dayCount = 1;
        this.dayLengthMinutes = 20.0; // Configurable: 20 minutes for a full day
        this.isPaused = false;
    }

    setTime(hours) {
        this.timeOfDay = Math.max(0, Math.min(23.99, hours));
        console.log(`Time manually set to: ${this.getTimeString()}`);
    }

    update(delta) {
        if (this.isPaused) return;

        // Convert delta (seconds) to game hours
        // 24 hours / (dayLengthMinutes * 60 seconds)
        const hoursPerSecond = 24.0 / (this.dayLengthMinutes * 60.0);
        this.timeOfDay += delta * hoursPerSecond;

        if (this.timeOfDay >= 24.0) {
            this.timeOfDay -= 24.0;
            this.dayCount++;
            console.log(`Day ${this.dayCount} has begun.`);
        }
    }

    getTimeString() {
        const hours = Math.floor(this.timeOfDay);
        const minutes = Math.floor((this.timeOfDay % 1) * 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    // Returns 0 to 1, where 0 is midnight, 0.5 is noon
    getNormalizedTime() {
        return this.timeOfDay / 24.0;
    }

    // Returns -1 to 1, where 1 is noon, -1 is midnight
    getSunIntensity() {
        // Simple sine curve for sun intensity
        // Noon (12.0) should be peak, Midnight (0.0/24.0) should be minimum
        return Math.sin((this.timeOfDay - 6.0) * (Math.PI / 12.0));
    }
}
