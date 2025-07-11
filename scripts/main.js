/**
 * Monadage Client-Side Application
 * Main entry point and application initialization
 */

import { appState, stateManager } from './utils/state-manager.js';
import { ImageProcessor } from './processors/image-processor.js';

// Import Web Components
import './components/image-uploader.js';
import './components/pipeline-builder.js';
import './components/result-viewer.js';

class MonadageApp {
    constructor() {
        this.imageProcessor = null;
        this.initialized = false;
        
        this.init();
    }

    async init() {
        try {
            console.log('🎨 Initializing Monadage...');
            
            // Check WebGL support
            const capabilities = ImageProcessor.getCapabilities();
            if (!capabilities.supported) {
                this.showError(`WebGL not supported: ${capabilities.reason}`);
                return;
            }
            
            console.log('✅ WebGL supported:', capabilities.webgl);
            
            // Initialize image processor
            this.imageProcessor = new ImageProcessor();
            
            // Set up error handling
            this.setupErrorHandling();
            
            // Set up demo effect cycling
            this.setupDemoEffect();
            
            // Set up keyboard shortcuts
            this.setupKeyboardShortcuts();
            
            // Set up state debugging (development only)
            if (this.isDevelopment()) {
                this.setupDebugging();
            }
            
            this.initialized = true;
            console.log('🚀 Monadage initialized successfully!');
            
            // Show initial state information
            this.showInitialInfo();
            
        } catch (error) {
            console.error('❌ Failed to initialize Monadage:', error);
            this.showError(`Initialization failed: ${error.message}`);
        }
    }

    setupErrorHandling() {
        // Global error handler
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            this.showError(`Unexpected error: ${event.error.message}`);
        });

        // Promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.showError(`Promise error: ${event.reason}`);
        });

        // Listen for application errors
        appState.subscribe((state, changes) => {
            if (changes === 'lastError' && state.lastError) {
                this.showError(state.lastError);
            }
        });
    }


    async setupDemoEffect() {
        const demoCanvas = document.getElementById('demo-canvas');
        const demoName = document.getElementById('demo-effect-name');
        
        if (!demoCanvas || !demoName) return;
        
        // Wait for image processor to be ready
        if (!this.imageProcessor || !this.imageProcessor.shadersLoaded) {
            setTimeout(() => this.setupDemoEffect(), 500);
            return;
        }
        
        // Example images list for variety
        const exampleImages = [
            'examples/source.jpeg',
            'examples/example.png', 
            'examples/example2.jpeg'
        ];
        
        // Cycle through effects with randomization
        const effects = appState.availableEffects;
        let currentDemoEffect = null;
        let currentDemoParams = null;
            
            const getRandomParams = (effectDef) => {
                const params = {};
                if (effectDef.parameters) {
                    Object.entries(effectDef.parameters).forEach(([paramName, paramConfig]) => {
                        const min = paramConfig.min || 0;
                        const max = paramConfig.max || 1;
                        const randomValue = min + Math.random() * (max - min);
                        params[paramName] = randomValue;
                    });
                }
                return params;
            };
            
            const cycleEffect = async () => {
                if (effects.length === 0) return;
                
                // Pick a random effect
                const randomIndex = Math.floor(Math.random() * effects.length);
                const effect = effects[randomIndex];
                
                // Pick a random image
                const randomImagePath = exampleImages[Math.floor(Math.random() * exampleImages.length)];
                
                // Fade out current content
                demoCanvas.style.opacity = '0';
                demoName.style.opacity = '0';
                document.getElementById('try-out-btn').style.opacity = '0';
                
                // Wait for fade out
                await new Promise(resolve => setTimeout(resolve, 250));
                
                // Update effect name
                demoName.textContent = effect.displayName;
                
                // Update the original image preview to match
                const originalImg = document.querySelector('img[alt="Original sample image"]');
                if (originalImg) {
                    originalImg.src = randomImagePath;
                }
                
                try {
                    // Load the random image
                    const randomImg = new Image();
                    randomImg.crossOrigin = 'anonymous';
                    
                    await new Promise((resolve, reject) => {
                        randomImg.onload = resolve;
                        randomImg.onerror = reject;
                        randomImg.src = randomImagePath;
                    });
                    
                    // Update canvas size for the new image
                    demoCanvas.width = randomImg.naturalWidth;
                    demoCanvas.height = randomImg.naturalHeight;
                    
                    // Create a mock image data object
                    const imageData = {
                        element: randomImg,
                        name: 'demo.png',
                        width: randomImg.naturalWidth,
                        height: randomImg.naturalHeight
                    };
                    
                    // Generate random parameters for this effect
                    const randomParams = getRandomParams(effect);
                    
                    // Store current demo effect and parameters for "Try Out" button
                    currentDemoEffect = effect;
                    currentDemoParams = randomParams;
                    
                    // Process with current effect using random parameters
                    const effectPipeline = [{
                        name: effect.name,
                        params: randomParams
                    }];
                    const result = await this.imageProcessor.processImage(imageData, effectPipeline);
                    
                    // Draw result to demo canvas
                    const ctx = demoCanvas.getContext('2d');
                    const tempImg = new Image();
                    tempImg.onload = () => {
                        ctx.clearRect(0, 0, demoCanvas.width, demoCanvas.height);
                        ctx.drawImage(tempImg, 0, 0, demoCanvas.width, demoCanvas.height);
                        
                        // Fade in new content
                        demoCanvas.style.opacity = '1';
                        demoName.style.opacity = '1';
                        document.getElementById('try-out-btn').style.opacity = '1';
                    };
                    tempImg.src = result.dataUrl;
                    
                } catch (error) {
                    console.warn('Demo effect failed:', effect.name, error);
                    // Fallback to solid color
                    const ctx = demoCanvas.getContext('2d');
                    ctx.fillStyle = effect.name === 'vaporwave' ? '#8b5cf6' : 
                                   effect.name === 'glitch_art' ? '#ef4444' :
                                   effect.name === 'neon_edge' ? '#06b6d4' : '#6b7280';
                    ctx.fillRect(0, 0, demoCanvas.width, demoCanvas.height);
                    
                    // Fade in even on error
                    demoCanvas.style.opacity = '1';
                    demoName.style.opacity = '1';
                    document.getElementById('try-out-btn').style.opacity = '1';
                }
            };
            
            // Set up "Try Out" button functionality
            const tryOutBtn = document.getElementById('try-out-btn');
            if (tryOutBtn) {
                tryOutBtn.addEventListener('click', async () => {
                    if (currentDemoEffect && currentDemoParams) {
                        // If no images uploaded, add the current demo image
                        if (appState.images.length === 0) {
                            try {
                                // Get the current demo image path
                                const currentImagePath = document.querySelector('img[alt="Original sample image"]').src;
                                
                                // Convert to blob and create a file
                                const response = await fetch(currentImagePath);
                                const blob = await response.blob();
                                const fileName = currentImagePath.split('/').pop();
                                const file = new File([blob], fileName, { type: blob.type });
                                
                                // Create image element
                                const img = new Image();
                                img.src = URL.createObjectURL(blob);
                                
                                await new Promise((resolve) => {
                                    img.onload = resolve;
                                });
                                
                                // Add to state manager
                                stateManager.addImage(file, img);
                                
                            } catch (error) {
                                console.warn('Failed to add demo image:', error);
                            }
                        }
                        
                        // Clear current pipeline and add the demo effect
                        appState.pipeline = [];
                        
                        // Add the current demo effect with its parameters
                        stateManager.addEffectToPipeline(currentDemoEffect.name);
                        
                        // Find the newly added effect and update its parameters
                        const newEffect = appState.pipeline[appState.pipeline.length - 1];
                        if (newEffect) {
                            Object.keys(currentDemoParams).forEach(paramName => {
                                stateManager.updateEffectParams(newEffect.id, paramName, currentDemoParams[paramName]);
                            });
                        }
                        
                        // Scroll to the pipeline section
                        const pipelineSection = document.querySelector('pipeline-builder');
                        if (pipelineSection) {
                            pipelineSection.scrollIntoView({ behavior: 'smooth' });
                        }
                    }
                });
            }
            
            // Start cycling with longer duration to appreciate each effect
            setInterval(cycleEffect, 5000); // 5 seconds per effect
            cycleEffect(); // Initial call
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Ctrl/Cmd + shortcuts
            if (event.ctrlKey || event.metaKey) {
                switch (event.key.toLowerCase()) {
                    case 'o':
                        event.preventDefault();
                        // Trigger file upload
                        const fileInput = document.querySelector('image-uploader')?.shadowRoot?.getElementById('file-input');
                        if (fileInput) fileInput.click();
                        break;
                    case 'enter':
                        event.preventDefault();
                        // Trigger processing
                        if (stateManager.canProcess()) {
                            const processBtn = document.querySelector('pipeline-builder')?.shadowRoot?.getElementById('process-btn');
                            if (processBtn && !processBtn.disabled) processBtn.click();
                        }
                        break;
                    case 'r':
                        event.preventDefault();
                        // Clear results
                        if (appState.results.length > 0) {
                            stateManager.clearResults();
                        }
                        break;
                }
            }
            
            // Escape key
            if (event.key === 'Escape') {
                // Close any open modals
                const effectSelector = document.querySelector('pipeline-builder')?.shadowRoot?.getElementById('effect-selector');
                if (effectSelector && effectSelector.style.display !== 'none') {
                    document.querySelector('pipeline-builder').hideEffectSelector();
                }
                
                const comparisonModal = document.querySelector('result-viewer')?.shadowRoot?.getElementById('comparison-modal');
                if (comparisonModal && comparisonModal.style.display !== 'none') {
                    document.querySelector('result-viewer').hideComparison();
                }
                
                // Clear errors
                this.hideError();
            }
        });
    }

    setupDebugging() {
        // Add debug panel in development
        window.monadage = {
            state: appState,
            stateManager,
            imageProcessor: this.imageProcessor,
            app: this,
            debug: () => stateManager.debugState(),
            capabilities: () => ImageProcessor.getCapabilities(),
            diagnostics: () => this.imageProcessor?.getDiagnostics()
        };
        
        console.log('🔧 Debug tools available at window.monadage');
    }

    showInitialInfo() {
        if (appState.pipeline.length > 0) {
            console.log(`📋 Loaded pipeline from URL: ${appState.pipeline.map(e => e.name).join(' → ')}`);
        }
        
        console.log('💡 Keyboard shortcuts:');
        console.log('  Ctrl/Cmd + O: Open files');
        console.log('  Ctrl/Cmd + Enter: Process images');
        console.log('  Ctrl/Cmd + R: Clear results');
        console.log('  Escape: Close modals/clear errors');
    }

    showError(message) {
        const errorModal = document.getElementById('error-modal');
        const errorMessage = document.getElementById('error-message');
        const errorClose = document.getElementById('error-close');
        
        if (errorModal && errorMessage) {
            errorMessage.textContent = message;
            errorModal.classList.remove('hidden');
            
            // Auto-hide after 10 seconds
            setTimeout(() => {
                this.hideError();
            }, 10000);
            
            // Set up close button
            if (errorClose) {
                errorClose.onclick = () => this.hideError();
            }
        } else {
            // Fallback to alert
            alert(`Error: ${message}`);
        }
    }

    hideError() {
        const errorModal = document.getElementById('error-modal');
        if (errorModal) {
            errorModal.classList.add('hidden');
        }
        stateManager.clearError();
    }

    showProcessingStatus(message) {
        const statusElement = document.getElementById('processing-status');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.classList.remove('hidden');
        }
    }

    hideProcessingStatus() {
        const statusElement = document.getElementById('processing-status');
        if (statusElement) {
            statusElement.classList.add('hidden');
        }
    }

    isDevelopment() {
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' ||
               window.location.protocol === 'file:';
    }

    // Cleanup method
    cleanup() {
        if (this.imageProcessor) {
            this.imageProcessor.cleanup();
        }
    }
}

// Initialize the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new MonadageApp();
    });
} else {
    new MonadageApp();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.monadageApp) {
        window.monadageApp.cleanup();
    }
});

// Handle processing status updates
appState.subscribe((state, changes) => {
    if (changes === 'processing' || (Array.isArray(changes) && changes.some(c => c.property === 'processing'))) {
        const statusElement = document.getElementById('processing-status');
        if (statusElement) {
            if (state.processing) {
                statusElement.classList.remove('hidden');
            } else {
                statusElement.classList.add('hidden');
            }
        }
    }
});

export { MonadageApp };