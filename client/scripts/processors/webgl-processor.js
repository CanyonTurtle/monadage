/**
 * WebGL Image Processor
 * Handles all WebGL-based image processing operations
 */

export class WebGLProcessor {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = null;
        this.programs = new Map();
        this.textures = new Map();
        this.framebuffers = [];
        this.currentTexture = null;
        
        this.initWebGL();
        this.createBaseShaders();
    }

    initWebGL() {
        // Try WebGL2 first, fallback to WebGL1
        this.gl = this.canvas.getContext('webgl2') || 
                  this.canvas.getContext('webgl') || 
                  this.canvas.getContext('experimental-webgl');
        
        if (!this.gl) {
            throw new Error('WebGL not supported in this browser');
        }

        // Enable necessary extensions
        const ext = this.gl.getExtension('OES_texture_float');
        if (!ext) {
            console.warn('Float textures not supported, some effects may be limited');
        }

        // Set up WebGL state
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this.gl.disable(this.gl.DEPTH_TEST);
        this.gl.disable(this.gl.CULL_FACE);
    }

    createBaseShaders() {
        // Basic vertex shader used by all effects
        const vertexShaderSource = `
            attribute vec2 a_position;
            attribute vec2 a_texCoord;
            varying vec2 v_texCoord;
            
            void main() {
                gl_Position = vec4(a_position, 0.0, 1.0);
                v_texCoord = a_texCoord;
            }
        `;

        // Basic pass-through fragment shader
        const fragmentShaderSource = `
            precision mediump float;
            uniform sampler2D u_texture;
            varying vec2 v_texCoord;
            
            void main() {
                gl_FragColor = texture2D(u_texture, v_texCoord);
            }
        `;

        this.baseProgram = this.createProgram(vertexShaderSource, fragmentShaderSource);
        this.setupGeometry();
    }

    createProgram(vertexSource, fragmentSource) {
        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentSource);
        
        const program = this.gl.createProgram();
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);
        
        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            const error = this.gl.getProgramInfoLog(program);
            this.gl.deleteProgram(program);
            throw new Error(`Program link error: ${error}`);
        }
        
        return program;
    }

    createShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            const error = this.gl.getShaderInfoLog(shader);
            this.gl.deleteShader(shader);
            throw new Error(`Shader compile error: ${error}`);
        }
        
        return shader;
    }

    setupGeometry() {
        // Create a quad that covers the entire canvas
        const positions = new Float32Array([
            -1, -1,  // bottom left
             1, -1,  // bottom right
            -1,  1,  // top left
             1,  1   // top right
        ]);
        
        const texCoords = new Float32Array([
            0, 0,    // bottom left
            1, 0,    // bottom right
            0, 1,    // top left
            1, 1     // top right
        ]);

        // Create and bind position buffer
        this.positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);

        // Create and bind texture coordinate buffer
        this.texCoordBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, texCoords, this.gl.STATIC_DRAW);
    }

    loadImage(imageElement) {
        const texture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        
        // Set texture parameters
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        
        // Upload image data
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, imageElement);
        
        // Update canvas size to match image
        this.canvas.width = imageElement.naturalWidth || imageElement.width;
        this.canvas.height = imageElement.naturalHeight || imageElement.height;
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        
        this.currentTexture = texture;
        return texture;
    }

    loadShaderEffect(name, fragmentShaderSource) {
        const vertexShaderSource = `
            attribute vec2 a_position;
            attribute vec2 a_texCoord;
            varying vec2 v_texCoord;
            
            void main() {
                gl_Position = vec4(a_position, 0.0, 1.0);
                v_texCoord = a_texCoord;
            }
        `;

        try {
            const program = this.createProgram(vertexShaderSource, fragmentShaderSource);
            this.programs.set(name, program);
            return program;
        } catch (error) {
            console.error(`Failed to load shader effect "${name}":`, error);
            throw error;
        }
    }

    applyEffect(effectName, params = {}) {
        const program = this.programs.get(effectName);
        if (!program) {
            throw new Error(`Effect "${effectName}" not loaded`);
        }

        if (!this.currentTexture) {
            throw new Error('No image loaded');
        }

        // Use the effect program
        this.gl.useProgram(program);

        // Set up attributes
        this.setupAttributes(program);

        // Set up uniforms
        this.setupUniforms(program, params);

        // Bind texture
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.currentTexture);
        this.gl.uniform1i(this.gl.getUniformLocation(program, 'u_texture'), 0);

        // Clear and draw
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    }

    setupAttributes(program) {
        // Position attribute
        const positionLocation = this.gl.getAttribLocation(program, 'a_position');
        if (positionLocation >= 0) {
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
            this.gl.enableVertexAttribArray(positionLocation);
            this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);
        }

        // Texture coordinate attribute
        const texCoordLocation = this.gl.getAttribLocation(program, 'a_texCoord');
        if (texCoordLocation >= 0) {
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
            this.gl.enableVertexAttribArray(texCoordLocation);
            this.gl.vertexAttribPointer(texCoordLocation, 2, this.gl.FLOAT, false, 0, 0);
        }
    }

    setupUniforms(program, params) {
        // Set resolution uniform
        const resolutionLocation = this.gl.getUniformLocation(program, 'u_resolution');
        if (resolutionLocation) {
            this.gl.uniform2f(resolutionLocation, this.canvas.width, this.canvas.height);
        }

        // Set time uniform
        const timeLocation = this.gl.getUniformLocation(program, 'u_time');
        if (timeLocation) {
            this.gl.uniform1f(timeLocation, performance.now() / 1000.0);
        }

        // Set custom parameters
        Object.entries(params).forEach(([key, value]) => {
            const location = this.gl.getUniformLocation(program, key);
            if (location) {
                if (typeof value === 'number') {
                    this.gl.uniform1f(location, value);
                } else if (Array.isArray(value)) {
                    switch (value.length) {
                        case 2:
                            this.gl.uniform2f(location, value[0], value[1]);
                            break;
                        case 3:
                            this.gl.uniform3f(location, value[0], value[1], value[2]);
                            break;
                        case 4:
                            this.gl.uniform4f(location, value[0], value[1], value[2], value[3]);
                            break;
                    }
                }
            }
        });
    }

    processImageChain(imageElement, effectChain) {
        // Load the initial image
        this.loadImage(imageElement);

        // Create framebuffers for intermediate steps if needed
        const needsFramebuffers = effectChain.length > 1;
        let framebuffers = [];
        let textures = [];

        if (needsFramebuffers) {
            for (let i = 0; i < effectChain.length - 1; i++) {
                const framebuffer = this.gl.createFramebuffer();
                const texture = this.gl.createTexture();
                
                this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
                this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.canvas.width, this.canvas.height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
                
                this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);
                this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, texture, 0);
                
                framebuffers.push(framebuffer);
                textures.push(texture);
            }
        }

        // Apply effects in sequence
        effectChain.forEach((effect, index) => {
            const isLastEffect = index === effectChain.length - 1;
            
            // Set render target
            if (isLastEffect) {
                this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
            } else {
                this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffers[index]);
            }
            
            // Apply the effect
            this.applyEffect(effect.name, effect.params);
            
            // Set up for next iteration
            if (!isLastEffect) {
                this.currentTexture = textures[index];
            }
        });

        // Clean up intermediate framebuffers
        framebuffers.forEach(fb => this.gl.deleteFramebuffer(fb));
        textures.forEach(tex => this.gl.deleteTexture(tex));

        // Reset to main framebuffer
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    }

    getImageData() {
        const pixels = new Uint8Array(this.canvas.width * this.canvas.height * 4);
        this.gl.readPixels(0, 0, this.canvas.width, this.canvas.height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixels);
        
        // WebGL coordinates are flipped vertically, so we need to flip the image
        const flippedPixels = new Uint8Array(pixels.length);
        const rowSize = this.canvas.width * 4;
        
        for (let y = 0; y < this.canvas.height; y++) {
            const srcOffset = y * rowSize;
            const dstOffset = (this.canvas.height - 1 - y) * rowSize;
            flippedPixels.set(pixels.subarray(srcOffset, srcOffset + rowSize), dstOffset);
        }
        
        return new ImageData(new Uint8ClampedArray(flippedPixels), this.canvas.width, this.canvas.height);
    }

    exportCanvas(format = 'image/png', quality = 0.9) {
        return this.canvas.toDataURL(format, quality);
    }

    cleanup() {
        // Clean up WebGL resources
        this.programs.forEach(program => this.gl.deleteProgram(program));
        this.programs.clear();
        
        this.textures.forEach(texture => this.gl.deleteTexture(texture));
        this.textures.clear();
        
        if (this.positionBuffer) this.gl.deleteBuffer(this.positionBuffer);
        if (this.texCoordBuffer) this.gl.deleteBuffer(this.texCoordBuffer);
        if (this.currentTexture) this.gl.deleteTexture(this.currentTexture);
        
        this.framebuffers.forEach(fb => this.gl.deleteFramebuffer(fb));
        this.framebuffers = [];
    }

    // Utility methods
    static isWebGLSupported() {
        try {
            const canvas = document.createElement('canvas');
            return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        } catch (e) {
            return false;
        }
    }

    static getWebGLInfo() {
        if (!this.isWebGLSupported()) {
            return null;
        }

        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        return {
            version: gl.getParameter(gl.VERSION),
            renderer: gl.getParameter(gl.RENDERER),
            vendor: gl.getParameter(gl.VENDOR),
            maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
            maxVaryingVectors: gl.getParameter(gl.MAX_VARYING_VECTORS),
            maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
            maxFragmentUniforms: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
            extensions: gl.getSupportedExtensions()
        };
    }
}