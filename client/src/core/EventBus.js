// Universal EventBus for Card Game Architecture
(function(root) {
    class EventBus {
        constructor() {
            this.listeners = new Map();
        }

        /**
         * Subscribe to an event
         * @param {string} event - Event name
         * @param {Function} callback - Event listener
         * @param {number} priority - Higher priority runs earlier (default: 0)
         * @returns {Function} Unsubscribe function
         */
        on(event, callback, priority = 0) {
            if (!this.listeners.has(event)) {
                this.listeners.set(event, []);
            }
            const list = this.listeners.get(event);
            const entry = { callback, priority };
            list.push(entry);
            list.sort((a, b) => b.priority - a.priority);

            return () => this.off(event, callback);
        }

        /**
         * Unsubscribe from an event
         * @param {string} event 
         * @param {Function} callback 
         */
        off(event, callback) {
            if (!this.listeners.has(event)) return;
            const list = this.listeners.get(event);
            const idx = list.findIndex(e => e.callback === callback);
            if (idx !== -1) {
                list.splice(idx, 1);
            }
        }

        /**
         * Trigger an event synchronously
         * @param {string} event 
         * @param {any} data 
         * @returns {any} Returns the data (possibly modified by listeners)
         */
        emit(event, data = {}) {
            if (!this.listeners.has(event)) return data;
            const list = [...this.listeners.get(event)];
            for (const entry of list) {
                try {
                    entry.callback(data);
                    if (data && typeof data === 'object' && data.cancel === true) {
                        break; // Stop propagation if canceled
                    }
                } catch (err) {
                    console.error(`[EventBus] Error in listener for "${event}":`, err);
                }
            }
            return data;
        }

        /**
         * Clear all event listeners or for a specific event
         */
        clear(event = null) {
            if (event) {
                this.listeners.delete(event);
            } else {
                this.listeners.clear();
            }
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = EventBus;
    }
    root.EventBus = EventBus;
})(typeof window !== 'undefined' ? window : global);
