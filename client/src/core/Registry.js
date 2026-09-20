// Content and Effect Registries for Card Game Architecture
(function(root) {
    class Registry {
        constructor(name) {
            this.name = name;
            this.items = new Map();
        }

        register(id, definition) {
            if (!id) {
                console.warn(`[${this.name}] Attempted to register item with empty id:`, definition);
                return;
            }
            this.items.set(id, definition);
            return definition;
        }

        get(id) {
            return this.items.get(id);
        }

        has(id) {
            return this.items.has(id);
        }

        getAll() {
            const res = {};
            for (const [k, v] of this.items.entries()) {
                res[k] = v;
            }
            return res;
        }

        list() {
            return Array.from(this.items.values());
        }

        clear() {
            this.items.clear();
        }
    }

    const HeroRegistry = new Registry('HeroRegistry');
    const SkillRegistry = new Registry('SkillRegistry');
    const CardRegistry = new Registry('CardRegistry');
    const StatusRegistry = new Registry('StatusRegistry');
    const EffectRegistry = new Registry('EffectRegistry');
    const PassiveRegistry = new Registry('PassiveRegistry');

    const Registries = {
        Registry,
        HeroRegistry,
        SkillRegistry,
        CardRegistry,
        StatusRegistry,
        EffectRegistry,
        PassiveRegistry,

        /**
         * Initialize all registries from GAME_CONFIG
         * @param {Object} config - window.GAME_CONFIG
         */
        loadFromConfig(config) {
            if (!config) return;

            // Load Characters / Heroes
            if (config.characters) {
                for (const [id, char] of Object.entries(config.characters)) {
                    HeroRegistry.register(id, char);
                }
            }

            // Load Skills
            if (config.skills) {
                for (const [id, skill] of Object.entries(config.skills)) {
                    SkillRegistry.register(id, skill);
                }
            }

            // Load Cards
            if (config.cards) {
                for (const [id, card] of Object.entries(config.cards)) {
                    CardRegistry.register(id, card);
                }
            }

            // Load Statuses
            if (config.statuses) {
                for (const [id, status] of Object.entries(config.statuses)) {
                    StatusRegistry.register(id, status);
                }
            }

            if (!Registries._logged) {
                console.log(`[Registries] Loaded: ${HeroRegistry.list().length} heroes, ${SkillRegistry.list().length} skills, ${CardRegistry.list().length} cards, ${StatusRegistry.list().length} statuses.`);
                Registries._logged = true;
            }
        }
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Registries;
    }
    root.Registries = Registries;
    root.HeroRegistry = HeroRegistry;
    root.SkillRegistry = SkillRegistry;
    root.CardRegistry = CardRegistry;
    root.StatusRegistry = StatusRegistry;
    root.EffectRegistry = EffectRegistry;
    root.PassiveRegistry = PassiveRegistry;

    // Auto-load if config is already defined
    if (root.GAME_CONFIG) {
        Registries.loadFromConfig(root.GAME_CONFIG);
    }
})(typeof window !== 'undefined' ? window : global);
