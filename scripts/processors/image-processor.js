/**
 * Main Image Processor
 * Coordinates WebGL processing and shader loading
 */

import { WebGLProcessor } from './webgl-processor.js';
import { effectRegistry } from '../effects/effect-registry.js';

export class ImageProcessor {
    constructor() {
        this.canvas = document.getElementById('processing-canvas');
        this.webglProcessor = new WebGLProcessor(this.canvas);
        this.webglProcessor.setEffectRegistry(effectRegistry);
        this.shadersLoaded = false;
        this.shaderCache = new Map();
        
        this.initializeShaders();
    }

    async initializeShaders() {
        try {
            await this.loadAllShaders();
            this.shadersLoaded = true;
        } catch (error) {
            console.error('Failed to initialize shaders:', error);
            throw new Error('WebGL initialization failed');
        }
    }

    async loadAllShaders() {
        // Get all effect names from the registry
        const allEffects = effectRegistry.getAllEffects();
        const shaderEffects = allEffects.map(effect => effect.name);

        const loadPromises = shaderEffects.map(effectName => 
            this.loadShader(effectName)
        );

        await Promise.all(loadPromises);
    }

    async loadShader(effectName) {
        if (this.shaderCache.has(effectName)) {
            return this.shaderCache.get(effectName);
        }

        try {
            const response = await fetch(`shaders/fragments/${effectName}.glsl`);
            if (!response.ok) {
                throw new Error(`Failed to load shader: ${response.status}`);
            }
            
            const fragmentSource = await response.text();
            this.webglProcessor.loadShaderEffect(effectName, fragmentSource);
            this.shaderCache.set(effectName, fragmentSource);
            
            return fragmentSource;
        } catch (error) {
            console.error(`Failed to load shader "${effectName}":`, error);
            
            // Fallback to pass-through shader
            const fallbackShader = `
                precision mediump float;
                uniform sampler2D u_texture;
                varying vec2 v_texCoord;
                
                void main() {
                    gl_FragColor = texture2D(u_texture, v_texCoord);
                }
            `;
            
            this.webglProcessor.loadShaderEffect(effectName, fallbackShader);
            this.shaderCache.set(effectName, fallbackShader);
            
            return fallbackShader;
        }
    }

    async processImage(imageData, pipeline) {
        if (!this.shadersLoaded) {
            await this.initializeShaders();
        }

        if (pipeline.length === 0) {
            throw new Error('No effects in pipeline');
        }

        try {
            // Prepare effect chain
            const effectChain = pipeline.map(effect => ({
                name: effect.name,
                params: this.processParams(effect.params)
            }));

            // Process the image through the effect chain
            this.webglProcessor.processImageChain(imageData.element, effectChain);

            // Get the result
            const resultDataUrl = this.webglProcessor.exportCanvas('image/png', 0.95);
            
            // Calculate result size (approximate)
            const resultSize = Math.round(resultDataUrl.length * 0.75); // Base64 encoding overhead
            
            return {
                originalName: imageData.name,
                dataUrl: resultDataUrl,
                width: this.canvas.width,
                height: this.canvas.height,
                size: resultSize,
                pipeline: pipeline.map(effect => effect.name)
            };
            
        } catch (error) {
            console.error('Image processing error:', error);
            throw new Error(`Processing failed: ${error.message}`);
        }
    }

    processParams(params) {
        // Convert parameter object to uniform-ready format
        const processedParams = {};
        
        Object.entries(params || {}).forEach(([key, value]) => {
            // Ensure parameter names start with 'u_' for uniforms
            const uniformName = key.startsWith('u_') ? key : `u_${key}`;
            processedParams[uniformName] = value;
        });
        
        return processedParams;
    }

    // Utility methods for different processing strategies
    async processLargeImage(imageData, pipeline, maxSize = 2048) {
        // For very large images, we might need to process in tiles
        // This is a simplified version - full implementation would handle tiling
        
        if (imageData.width <= maxSize && imageData.height <= maxSize) {
            return this.processImage(imageData, pipeline);
        }
        
        // Scale down for processing, then scale result back up
        const scaleFactor = Math.min(maxSize / imageData.width, maxSize / imageData.height);
        
        // Create scaled canvas
        const scaledCanvas = document.createElement('canvas');
        scaledCanvas.width = Math.floor(imageData.width * scaleFactor);
        scaledCanvas.height = Math.floor(imageData.height * scaleFactor);
        
        const ctx = scaledCanvas.getContext('2d');
        ctx.drawImage(imageData.element, 0, 0, scaledCanvas.width, scaledCanvas.height);
        
        // Create a scaled image element
        const scaledImage = new Image();
        scaledImage.src = scaledCanvas.toDataURL();
        
        await new Promise(resolve => {
            scaledImage.onload = resolve;
        });
        
        // Process the scaled image
        const scaledImageData = {
            ...imageData,
            element: scaledImage,
            width: scaledCanvas.width,
            height: scaledCanvas.height
        };
        
        return this.processImage(scaledImageData, pipeline);
    }

    // Memory management
    cleanup() {
        if (this.webglProcessor) {
            this.webglProcessor.cleanup();
        }
        this.shaderCache.clear();
    }

    // Get processing capabilities
    static getCapabilities() {
        if (!WebGLProcessor.isWebGLSupported()) {
            return {
                supported: false,
                reason: 'WebGL not supported'
            };
        }
        
        const info = WebGLProcessor.getWebGLInfo();
        
        return {
            supported: true,
            webgl: info,
            maxTextureSize: info?.maxTextureSize || 2048,
            extensions: info?.extensions || []
        };
    }

    // Diagnostic information
    getDiagnostics() {
        return {
            shadersLoaded: this.shadersLoaded,
            loadedShaders: Array.from(this.shaderCache.keys()),
            webglInfo: WebGLProcessor.getWebGLInfo(),
            canvasSize: {
                width: this.canvas.width,
                height: this.canvas.height
            }
        };
    }
}