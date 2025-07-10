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

    setupDemoEffect() {
        const demoCanvas = document.getElementById('demo-canvas');
        const demoName = document.getElementById('demo-effect-name');
        
        if (!demoCanvas || !demoName) return;
        
        // Create a simple gradient for demo
        const ctx = demoCanvas.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, demoCanvas.width, demoCanvas.height);
        gradient.addColorStop(0, '#3b82f6');
        gradient.addColorStop(1, '#8b5cf6');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, demoCanvas.width, demoCanvas.height);
        
        // Cycle through effect names
        const effects = appState.availableEffects;
        let currentIndex = 0;
        
        const cycleEffect = () => {
            if (effects.length === 0) return;
            
            const effect = effects[currentIndex];
            demoName.textContent = effect.displayName;
            
            // Add simple visual variation based on effect
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, demoCanvas.width, demoCanvas.height);
            
            // Add effect-specific overlay
            switch (effect.name) {
                case 'vaporwave':
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                    ctx.lineWidth = 1;
                    for (let i = 0; i < demoCanvas.width; i += 20) {
                        ctx.beginPath();
                        ctx.moveTo(i, 0);
                        ctx.lineTo(i, demoCanvas.height);
                        ctx.stroke();
                    }
                    break;
                case 'glitch_art':
                    ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
                    ctx.fillRect(5, 0, demoCanvas.width - 10, demoCanvas.height);
                    break;
                case 'neon_edge':
                    ctx.strokeStyle = '#00ffff';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(2, 2, demoCanvas.width - 4, demoCanvas.height - 4);
                    break;
            }
            
            currentIndex = (currentIndex + 1) % effects.length;
        };
        
        // Start cycling
        setInterval(cycleEffect, 2000);
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