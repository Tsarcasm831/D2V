import { debugLog } from '../utils/logger.js';

export class UILoader {
    constructor() {
        this.components = [
            'ui/menus.html',
            'ui/loading.html',
            'ui/character_creator.html',
            'ui/game_ui.html',
            'ui/popups.html'
        ];
    }

    async loadAll() {
        const promises = this.components.map(path => this.loadComponent(path));
        await Promise.all(promises);
        debugLog('All UI components loaded');
    }

    async loadComponent(path) {
        try {
            // if (path === 'ui/game_ui.html') {
            //     const link = document.createElement('link');
            //     link.rel = 'stylesheet';
            //     link.href = 'ui/inventory_new.css';
            //     document.head.appendChild(link);
            // }
            const response = await fetch(path);
            if (!response.ok) throw new Error(`Failed to load ${path}: ${response.statusText}`);
            const html = await response.text();
            
            // Create a temporary container
            const temp = document.createElement('div');
            temp.innerHTML = html;

            // Move children to body
            while (temp.firstChild) {
                document.body.appendChild(temp.firstChild);
            }
        } catch (error) {
            console.error(error);
        }
    }
}
