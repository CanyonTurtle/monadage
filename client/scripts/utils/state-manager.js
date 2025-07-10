/**
 * Reactive State Management System
 * Provides centralized state management with automatic UI updates
 */

export class ReactiveState {
    constructor(initialState = {}) {
        this.listeners = new Set();
        this.state = { ...initialState };
        
        // Create proxy to intercept state changes
        this.proxy = new Proxy(this.state, {
            set: (target, property, value) => {
                const oldValue = target[property];
                target[property] = value;
                
                // Notify listeners of change
                this.notify(property, value, oldValue);
                return true;
            },
            
            get: (target, property) => {
                return target[property];
            }
        });
        
        return this.proxy;
    }
    
    subscribe(listener) {
        this.listeners.add(listener);
        
        // Return unsubscribe function
        return () => {
            this.listeners.delete(listener);
        };
    }
    
    notify(property, newValue, oldValue) {
        this.listeners.forEach(listener => {
            try {
                listener(this.state, property, newValue, oldValue);
            } catch (error) {
                console.error('State listener error:', error);
            }
        });
    }
    
    // Batch updates to prevent multiple notifications
    batch(updateFn) {
        const originalNotify = this.notify;
        const changes = [];
        
        // Temporarily replace notify to collect changes
        this.notify = (property, newValue, oldValue) => {
            changes.push({ property, newValue, oldValue });
        };
        
        try {
            updateFn(this.proxy);
        } finally {
            // Restore original notify and send batched update
            this.notify = originalNotify;
            
            if (changes.length > 0) {
                this.listeners.forEach(listener => {
                    try {
                        listener(this.state, changes);
                    } catch (error) {
                        console.error('State listener error:', error);
                    }
                });
            }
        }
    }
}

// Global application state
export const appState = new ReactiveState({
    // Image management
    images: [],
    currentImage: null,
    
    // Pipeline management
    pipeline: [],
    availableEffects: [
        {
            name: 'vaporwave',
            displayName: 'Vaporwave',
            description: 'Retro aesthetic with pink/purple gradients and grid overlays',
            category: 'artistic',
            params: {}
        },
        {
            name: 'glitch_art',
            displayName: 'Glitch Art',
            description: 'Digital corruption with pixel corruption and color channel shifts',
            category: 'artistic',
            params: {}
        },
        {
            name: 'neon_edge',
            displayName: 'Neon Edge',
            description: 'Glowing edge detection on dark backgrounds',
            category: 'artistic',
            params: {}
        },
        {
            name: 'oil_painting',
            displayName: 'Oil Painting',
            description: 'Artistic oil painting simulation',
            category: 'artistic',
            params: {
                u_intensity: { type: 'float', default: 1.0, min: 0.5, max: 2.0, label: 'Brush Size' }
            }
        },
        {
            name: 'pixel_sort',
            displayName: 'Pixel Sort',
            description: 'Algorithmic pixel sorting for abstract patterns',
            category: 'abstract',
            params: {
                u_threshold: { type: 'float', default: 0.5, min: 0.0, max: 1.0, label: 'Threshold' }
            }
        }
    ],
    
    // Processing state
    processing: false,
    processingProgress: 0,
    
    // Results
    results: [],
    
    // UI state
    selectedEffect: null,
    draggedEffect: null,
    showEffectSelector: false,
    
    // Error handling
    lastError: null
});

// State utilities
export class StateManager {
    constructor() {
        this.setupURLSync();
        this.setupLocalStorage();
    }
    
    setupURLSync() {
        // Sync pipeline to URL parameters
        appState.subscribe((state, changes) => {
            if (Array.isArray(changes)) {
                // Batch update
                const pipelineChanged = changes.some(change => change.property === 'pipeline');
                if (pipelineChanged) {
                    this.updateURL();
                }
            } else if (changes === 'pipeline') {
                // Single update
                this.updateURL();
            }
        });
        
        // Load initial state from URL
        this.loadFromURL();
    }
    
    updateURL() {
        const url = new URL(window.location);
        
        if (appState.pipeline.length > 0) {
            const pipelineParam = appState.pipeline.map(effect => effect.name).join(',');
            url.searchParams.set('pipeline', pipelineParam);
        } else {
            url.searchParams.delete('pipeline');
        }
        
        // Update URL without triggering navigation
        window.history.replaceState({}, '', url.toString());
    }
    
    loadFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const pipelineParam = urlParams.get('pipeline');
        
        if (pipelineParam) {
            const effectNames = pipelineParam.split(',').filter(name => name.trim());
            const effects = effectNames
                .map(name => appState.availableEffects.find(effect => effect.name === name.trim()))
                .filter(effect => effect)
                .map(effect => ({
                    ...effect,
                    id: this.generateId(),
                    params: { ...effect.params }
                }));
            
            appState.pipeline = effects;
        }
    }
    
    setupLocalStorage() {
        const STORAGE_KEY = 'monadage_state';
        
        // Save state to localStorage on changes
        appState.subscribe((state) => {
            try {
                const stateToSave = {
                    pipeline: state.pipeline,
                    // Add other persistable state here
                };
                localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
            } catch (error) {
                console.warn('Failed to save state to localStorage:', error);
            }
        });
        
        // Load state from localStorage on init
        try {
            const savedState = localStorage.getItem(STORAGE_KEY);
            if (savedState) {
                const parsed = JSON.parse(savedState);
                if (parsed.pipeline && !appState.pipeline.length) {
                    // Only load if URL didn't provide pipeline
                    appState.pipeline = parsed.pipeline;
                }
            }
        } catch (error) {
            console.warn('Failed to load state from localStorage:', error);
        }
    }
    
    // Action creators
    addImage(file, imageElement) {
        const image = {
            id: this.generateId(),
            file,
            element: imageElement,
            name: file.name,
            size: file.size,
            width: imageElement.naturalWidth,
            height: imageElement.naturalHeight,
            preview: imageElement.src
        };
        
        appState.images = [...appState.images, image];
        
        if (!appState.currentImage) {
            appState.currentImage = image;
        }
        
        return image;
    }
    
    removeImage(imageId) {
        appState.images = appState.images.filter(img => img.id !== imageId);
        
        if (appState.currentImage && appState.currentImage.id === imageId) {
            appState.currentImage = appState.images[0] || null;
        }
    }
    
    setCurrentImage(imageId) {
        const image = appState.images.find(img => img.id === imageId);
        if (image) {
            appState.currentImage = image;
        }
    }
    
    addEffectToPipeline(effectName, insertIndex = -1) {
        const effectTemplate = appState.availableEffects.find(effect => effect.name === effectName);
        if (!effectTemplate) {
            throw new Error(`Effect "${effectName}" not found`);
        }
        
        const effect = {
            ...effectTemplate,
            id: this.generateId(),
            params: this.initializeParams(effectTemplate.params)
        };
        
        const newPipeline = [...appState.pipeline];
        
        if (insertIndex >= 0 && insertIndex < newPipeline.length) {
            newPipeline.splice(insertIndex, 0, effect);
        } else {
            newPipeline.push(effect);
        }
        
        appState.pipeline = newPipeline;
        return effect;
    }
    
    removeEffectFromPipeline(effectId) {
        appState.pipeline = appState.pipeline.filter(effect => effect.id !== effectId);
    }
    
    reorderPipeline(fromIndex, toIndex) {
        const newPipeline = [...appState.pipeline];
        const [movedEffect] = newPipeline.splice(fromIndex, 1);
        newPipeline.splice(toIndex, 0, movedEffect);
        appState.pipeline = newPipeline;
    }
    
    updateEffectParams(effectId, paramName, value) {
        const effectIndex = appState.pipeline.findIndex(effect => effect.id === effectId);
        if (effectIndex >= 0) {
            const newPipeline = [...appState.pipeline];
            newPipeline[effectIndex] = {
                ...newPipeline[effectIndex],
                params: {
                    ...newPipeline[effectIndex].params,
                    [paramName]: value
                }
            };
            appState.pipeline = newPipeline;
        }
    }
    
    setProcessing(isProcessing, progress = 0) {
        appState.batch(state => {
            state.processing = isProcessing;
            state.processingProgress = progress;
        });
    }
    
    addResult(result) {
        appState.results = [...appState.results, {
            ...result,
            id: this.generateId(),
            timestamp: Date.now()
        }];
    }
    
    clearResults() {
        appState.results = [];
    }
    
    setError(error) {
        appState.lastError = error;
        console.error('Application error:', error);
    }
    
    clearError() {
        appState.lastError = null;
    }
    
    // Utility methods
    initializeParams(paramTemplate) {
        const params = {};
        Object.entries(paramTemplate || {}).forEach(([key, config]) => {
            params[key] = config.default;
        });
        return params;
    }
    
    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }
    
    // Validation
    canProcess() {
        return appState.images.length > 0 && 
               appState.pipeline.length > 0 && 
               !appState.processing;
    }
    
    getEffectByName(name) {
        return appState.availableEffects.find(effect => effect.name === name);
    }
    
    // Debug helpers
    debugState() {
        console.log('Current state:', {
            images: appState.images.length,
            pipeline: appState.pipeline.map(e => e.name),
            processing: appState.processing,
            results: appState.results.length
        });
    }
}

// Create global state manager instance
export const stateManager = new StateManager();