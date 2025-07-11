/**
 * Effect Registry and Parameter Schema System
 * Manages effects, their parameters, and UI generation
 */

export class EffectRegistry {
    constructor() {
        this.effects = new Map();
        this.loadCoreEffects();
    }

    registerEffect(name, config) {
        // Validate that effect has getDefaults method if it has parameters
        if (config.parameters && Object.keys(config.parameters).length > 0 && !config.getDefaults) {
            throw new Error(`Effect "${name}" has parameters but no getDefaults() method`);
        }

        this.effects.set(name, {
            name,
            displayName: config.displayName || name,
            description: config.description || '',
            parameters: config.parameters || {},
            category: config.category || 'general',
            getDefaults: config.getDefaults || (() => ({}))
        });
    }

    getEffect(name) {
        return this.effects.get(name);
    }

    getAllEffects() {
        return Array.from(this.effects.values());
    }

    getEffectsByCategory(category) {
        return this.getAllEffects().filter(effect => effect.category === category);
    }

    loadCoreEffects() {
        // Vaporwave with parameterized quantization
        this.registerEffect('vaporwave', {
            displayName: 'Vaporwave',
            description: 'Retro aesthetic with neon colors and grid overlays',
            category: 'retro',
            getDefaults: () => ({
                u_quantization_levels: 8.0,
                u_grid_size: 20.0,
                u_hue_shift: 0.8,
                u_saturation_boost: 1.5
            }),
            parameters: {
                u_quantization_levels: {
                    type: 'range',
                    label: 'Quantization Levels',
                    min: 2,
                    max: 32,
                    default: 8,
                    step: 1,
                    description: 'Number of color levels to quantize to'
                },
                u_grid_size: {
                    type: 'range',
                    label: 'Grid Size',
                    min: 10,
                    max: 50,
                    default: 20,
                    step: 5,
                    description: 'Spacing between grid lines in pixels'
                },
                u_hue_shift: {
                    type: 'range',
                    label: 'Hue Shift',
                    min: 0,
                    max: 1,
                    default: 0.8,
                    step: 0.1,
                    description: 'Amount to shift hue towards pink/purple'
                },
                u_saturation_boost: {
                    type: 'range',
                    label: 'Saturation Boost',
                    min: 1,
                    max: 3,
                    default: 1.5,
                    step: 0.1,
                    description: 'Saturation enhancement multiplier'
                }
            }
        });

        // Oil Painting
        this.registerEffect('oil_painting', {
            displayName: 'Oil Painting',
            description: 'Painterly effect with brush strokes',
            category: 'artistic',
            getDefaults: () => ({
                u_intensity: 1.0
            }),
            parameters: {
                u_intensity: {
                    type: 'range',
                    label: 'Brush Size',
                    min: 0.5,
                    max: 3.0,
                    default: 1.0,
                    step: 0.1,
                    description: 'Size of the brush strokes'
                }
            }
        });

        // Glitch Art
        this.registerEffect('glitch_art', {
            displayName: 'Glitch Art',
            description: 'Digital corruption effects',
            category: 'digital',
            getDefaults: () => ({
                u_intensity: 0.5
            }),
            parameters: {
                u_intensity: {
                    type: 'range',
                    label: 'Glitch Intensity',
                    min: 0.0,
                    max: 1.0,
                    default: 0.5,
                    step: 0.05,
                    description: 'Strength of glitch effects'
                }
            }
        });

        // Neon Edge
        this.registerEffect('neon_edge', {
            displayName: 'Neon Edge',
            description: 'Glowing edge detection',
            category: 'digital',
            getDefaults: () => ({
                u_intensity: 1.0
            }),
            parameters: {
                u_intensity: {
                    type: 'range',
                    label: 'Glow Intensity',
                    min: 0.5,
                    max: 3.0,
                    default: 1.0,
                    step: 0.1,
                    description: 'Intensity of the neon glow'
                }
            }
        });

        // Pixel Sort
        this.registerEffect('pixel_sort', {
            displayName: 'Pixel Sort',
            description: 'Sorted pixel displacement',
            category: 'digital',
            getDefaults: () => ({
                u_intensity: 0.5
            }),
            parameters: {
                u_intensity: {
                    type: 'range',
                    label: 'Sort Intensity',
                    min: 0.0,
                    max: 1.0,
                    default: 0.5,
                    step: 0.05,
                    description: 'Strength of pixel sorting'
                }
            }
        });
    }
}

// Global registry instance
export const effectRegistry = new EffectRegistry();