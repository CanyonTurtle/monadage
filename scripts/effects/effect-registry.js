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

        // Cyberpunk
        this.registerEffect('cyberpunk', {
            displayName: 'Cyberpunk',
            description: 'Futuristic digital aesthetic with neon colors and scan lines',
            category: 'digital',
            getDefaults: () => ({
                u_scan_intensity: 0.5,
                u_contrast: 1.0,
                u_neon_glow: 0.8,
                u_chromatic_shift: 0.5
            }),
            parameters: {
                u_scan_intensity: {
                    type: 'range',
                    label: 'Scan Lines',
                    min: 0.0,
                    max: 1.0,
                    default: 0.5,
                    step: 0.1,
                    description: 'Intensity of scan line effects'
                },
                u_contrast: {
                    type: 'range',
                    label: 'Contrast',
                    min: 0.0,
                    max: 2.0,
                    default: 1.0,
                    step: 0.1,
                    description: 'Overall contrast enhancement'
                },
                u_neon_glow: {
                    type: 'range',
                    label: 'Neon Glow',
                    min: 0.0,
                    max: 2.0,
                    default: 0.8,
                    step: 0.1,
                    description: 'Intensity of neon color effects'
                },
                u_chromatic_shift: {
                    type: 'range',
                    label: 'Chromatic Shift',
                    min: 0.0,
                    max: 1.0,
                    default: 0.5,
                    step: 0.1,
                    description: 'Chromatic aberration strength'
                }
            }
        });

        // Watercolor
        this.registerEffect('watercolor', {
            displayName: 'Watercolor',
            description: 'Soft watercolor painting effect with organic flows',
            category: 'artistic',
            getDefaults: () => ({
                u_brush_size: 1.0,
                u_flow_strength: 0.5,
                u_paper_texture: 0.8,
                u_color_bleeding: 0.6
            }),
            parameters: {
                u_brush_size: {
                    type: 'range',
                    label: 'Brush Size',
                    min: 0.5,
                    max: 3.0,
                    default: 1.0,
                    step: 0.1,
                    description: 'Size of watercolor brush strokes'
                },
                u_flow_strength: {
                    type: 'range',
                    label: 'Flow Strength',
                    min: 0.0,
                    max: 1.0,
                    default: 0.5,
                    step: 0.1,
                    description: 'Strength of watercolor flow patterns'
                },
                u_paper_texture: {
                    type: 'range',
                    label: 'Paper Texture',
                    min: 0.0,
                    max: 1.0,
                    default: 0.8,
                    step: 0.1,
                    description: 'Visibility of paper texture'
                },
                u_color_bleeding: {
                    type: 'range',
                    label: 'Color Bleeding',
                    min: 0.0,
                    max: 1.0,
                    default: 0.6,
                    step: 0.1,
                    description: 'Amount of color bleeding between areas'
                }
            }
        });

        // Chrome
        this.registerEffect('chrome', {
            displayName: 'Chrome',
            description: 'Reflective metallic chrome surface effect',
            category: 'artistic',
            getDefaults: () => ({
                u_reflection_strength: 0.8,
                u_distortion: 0.5,
                u_highlight_intensity: 1.0,
                u_surface_roughness: 0.3
            }),
            parameters: {
                u_reflection_strength: {
                    type: 'range',
                    label: 'Reflection Strength',
                    min: 0.0,
                    max: 1.0,
                    default: 0.8,
                    step: 0.1,
                    description: 'Strength of reflective properties'
                },
                u_distortion: {
                    type: 'range',
                    label: 'Surface Distortion',
                    min: 0.0,
                    max: 1.0,
                    default: 0.5,
                    step: 0.1,
                    description: 'Amount of surface distortion'
                },
                u_highlight_intensity: {
                    type: 'range',
                    label: 'Highlight Intensity',
                    min: 0.0,
                    max: 2.0,
                    default: 1.0,
                    step: 0.1,
                    description: 'Intensity of specular highlights'
                },
                u_surface_roughness: {
                    type: 'range',
                    label: 'Surface Roughness',
                    min: 0.0,
                    max: 1.0,
                    default: 0.3,
                    step: 0.1,
                    description: 'Roughness of the chrome surface'
                }
            }
        });

        // Film Noir
        this.registerEffect('film_noir', {
            displayName: 'Film Noir',
            description: 'Classic black and white with dramatic lighting',
            category: 'vintage',
            getDefaults: () => ({
                u_contrast: 0.8,
                u_shadow_depth: 0.7,
                u_highlight_intensity: 0.6,
                u_grain_amount: 0.5
            }),
            parameters: {
                u_contrast: {
                    type: 'range',
                    label: 'Contrast',
                    min: 0.0,
                    max: 2.0,
                    default: 0.8,
                    step: 0.1,
                    description: 'Dramatic contrast enhancement'
                },
                u_shadow_depth: {
                    type: 'range',
                    label: 'Shadow Depth',
                    min: 0.0,
                    max: 1.0,
                    default: 0.7,
                    step: 0.1,
                    description: 'Depth and richness of shadows'
                },
                u_highlight_intensity: {
                    type: 'range',
                    label: 'Highlight Intensity',
                    min: 0.0,
                    max: 1.0,
                    default: 0.6,
                    step: 0.1,
                    description: 'Intensity of bright highlights'
                },
                u_grain_amount: {
                    type: 'range',
                    label: 'Film Grain',
                    min: 0.0,
                    max: 1.0,
                    default: 0.5,
                    step: 0.1,
                    description: 'Amount of film grain texture'
                }
            }
        });
    }
}

// Global registry instance
export const effectRegistry = new EffectRegistry();