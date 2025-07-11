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
import './components/effect-controls.js';

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
            
            // Connect image processor to effect controls
            this.setupEffectControls();
            
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

    setupEffectControls() {
        // Wait for DOM to be ready
        setTimeout(() => {
            const effectControls = document.getElementById('effect-controls');
            if (effectControls && this.imageProcessor) {
                effectControls.setImageProcessor(this.imageProcessor);
            }
        }, 100);
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
        
        // Load the source image
        const sourceImg = new Image();
        sourceImg.crossOrigin = 'anonymous';
        
        sourceImg.onload = () => {
            // Set canvas size to match demo size
            demoCanvas.width = 128;
            demoCanvas.height = 128;
            
            // Cycle through effects
            const effects = appState.availableEffects;
            let currentIndex = 0;
            
            const cycleEffect = async () => {
                if (effects.length === 0) return;
                
                const effect = effects[currentIndex];
                demoName.textContent = effect.displayName;
                
                try {
                    // Create a mock image data object
                    const imageData = {
                        element: sourceImg,
                        name: 'demo.png',
                        width: sourceImg.naturalWidth,
                        height: sourceImg.naturalHeight
                    };
                    
                    // Process with current effect (structure it properly)
                    const effectPipeline = [{
                        name: effect.name,
                        params: {} // Use default parameters
                    }];
                    const result = await this.imageProcessor.processImage(imageData, effectPipeline);
                    
                    // Draw result to demo canvas
                    const ctx = demoCanvas.getContext('2d');
                    const tempImg = new Image();
                    tempImg.onload = () => {
                        ctx.clearRect(0, 0, demoCanvas.width, demoCanvas.height);
                        ctx.drawImage(tempImg, 0, 0, demoCanvas.width, demoCanvas.height);
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
                }
                
                currentIndex = (currentIndex + 1) % effects.length;
            };
            
            // Start cycling
            setInterval(cycleEffect, 3000); // Slower for real processing
            cycleEffect(); // Initial call
        };
        
        sourceImg.src = 'examples/source.png';
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