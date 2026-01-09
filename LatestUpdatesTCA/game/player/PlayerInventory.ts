
export class PlayerInventory {
    items: string[] = Array(32).fill('');
    capacity: number = 32;
    isDirty: boolean = false;

    constructor(initialItems?: string[]) {
        if (initialItems) {
            // Ensure we fill up to capacity if initial is smaller
            this.items = [...initialItems, ...Array(Math.max(0, this.capacity - initialItems.length)).fill('')];
            this.isDirty = true;
        }
    }

    addItem(itemName: string): boolean {
        const emptySlot = this.items.findIndex(s => s === '');
        if (emptySlot === -1) return false;
        
        const newInv = [...this.items];
        newInv[emptySlot] = itemName;
        this.items = newInv;
        
        this.isDirty = true;
        return true;
    }

    setItems(items: string[]) {
        // Simple equality check to prevent infinite loops with React effects
        if (JSON.stringify(this.items) !== JSON.stringify(items)) {
            this.items = [...items];
            this.isDirty = true;
        }
    }
}
