/**
 * Effect Controls Web Component
 * Dynamically renders parameter controls for effects
 */

import { ParameterControlsBuilder, EffectControlsPanel } from '../ui/parameter-controls.js';
import { effectRegistry } from '../effects/effect-registry.js';
import { appState } from '../utils/state-manager.js';

class EffectControls extends HTMLElement {
    constructor() {
        super();
        this.currentEffect = null;
        this.controlsPanel = null;
        this.imageProcessor = null;
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
    }

    render() {
        this.innerHTML = `
            <div class="effect-controls bg-white rounded-lg shadow-lg p-6 max-w-md">
                <div class="controls-header mb-4">
                    <h2 class="text-xl font-bold text-gray-900 mb-2">Effect Settings</h2>
                    <p class="text-sm text-gray-600">
                        Select an effect from the pipeline to adjust its parameters
                    </p>
                </div>
                
                <div class="effect-selector mb-6">
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        Choose Effect
                    </label>
                    <select id="effect-selector" class="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                        <option value="">Select an effect...</option>
                    </select>
                </div>
                
                <div id="parameter-controls" class="parameter-controls">
                    <!-- Dynamic parameter controls will be inserted here -->
                </div>
            </div>
        `;

        this.populateEffectSelector();
        this.initializeControlsPanel();
    }

    populateEffectSelector() {
        const selector = this.querySelector('#effect-selector');
        const effects = effectRegistry.getAllEffects();
        
        // Group effects by category
        const categories = {};
        effects.forEach(effect => {
            const category = effect.category || 'general';
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(effect);
        });

        // Clear existing options except the first one
        selector.innerHTML = '<option value="">Select an effect...</option>';

        // Add effects grouped by category
        Object.entries(categories).forEach(([category, categoryEffects]) => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = category.charAt(0).toUpperCase() + category.slice(1);
            
            categoryEffects.forEach(effect => {
                const option = document.createElement('option');
                option.value = effect.name;
                option.textContent = effect.displayName;
                optgroup.appendChild(option);
            });
            
            selector.appendChild(optgroup);
        });
    }

    initializeControlsPanel() {
        const controlsContainer = this.querySelector('#parameter-controls');
        this.controlsPanel = new EffectControlsPanel(
            controlsContainer,
            effectRegistry,
            this.imageProcessor
        );
    }

    setupEventListeners() {
        const selector = this.querySelector('#effect-selector');
        
        selector.addEventListener('change', (e) => {
            const effectName = e.target.value;
            if (effectName) {
                this.showEffectControls(effectName);
            } else {
                this.hideControls();
            }
        });

        // Listen for pipeline changes
        appState.subscribe((state, property) => {
            if (property === 'pipeline') {
                this.updateFromPipeline();
            }
        });

        // Listen for current image changes to enable real-time preview
        appState.subscribe((state, property) => {
            if (property === 'currentImage') {
                if (this.controlsPanel && state.currentImage && state.currentImage.element) {
                    this.controlsPanel.setPreviewImage(state.currentImage.element);
                }
            }
        });
    }

    showEffectControls(effectName) {
        const effect = effectRegistry.getEffect(effectName);
        if (!effect) return;

        this.currentEffect = effect;
        
        // Only show controls if the effect has parameters
        if (Object.keys(effect.parameters).length > 0) {
            this.controlsPanel.showEffectControls(effectName);
            this.querySelector('#parameter-controls').style.display = 'block';
        } else {
            this.hideControls();
            this.showNoParametersMessage(effect);
        }
    }

    showNoParametersMessage(effect) {
        const controlsContainer = this.querySelector('#parameter-controls');
        controlsContainer.style.display = 'block';
        controlsContainer.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <div class="mb-2">
                    <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                </div>
                <p class="text-sm font-medium text-gray-900 mb-1">${effect.displayName}</p>
                <p class="text-xs text-gray-500">This effect has no adjustable parameters</p>
            </div>
        `;
    }

    hideControls() {
        this.currentEffect = null;
        this.controlsPanel.hide();
        this.querySelector('#parameter-controls').style.display = 'none';
    }

    updateFromPipeline() {
        // If we have an effect selected, check if it's still in the pipeline
        if (this.currentEffect) {
            const pipeline = appState.pipeline;
            const effectStillInPipeline = pipeline.some(step => step.name === this.currentEffect.name);
            
            if (!effectStillInPipeline) {
                this.hideControls();
                this.querySelector('#effect-selector').value = '';
            }
        }
    }

    setImageProcessor(imageProcessor) {
        this.imageProcessor = imageProcessor;
        if (this.controlsPanel) {
            this.controlsPanel.webglProcessor = imageProcessor.webglProcessor;
            
            // Set current image if available
            if (appState.currentImage && appState.currentImage.element) {
                this.controlsPanel.setPreviewImage(appState.currentImage.element);
            }
        }
    }

    // Public method to select an effect programmatically
    selectEffect(effectName) {
        const selector = this.querySelector('#effect-selector');
        selector.value = effectName;
        this.showEffectControls(effectName);
    }

    // Public method to get current parameter values
    getCurrentParameters() {
        return this.controlsPanel ? this.controlsPanel.getCurrentParameters() : {};
    }
}

// Register the custom element
customElements.define('effect-controls', EffectControls);

export { EffectControls };