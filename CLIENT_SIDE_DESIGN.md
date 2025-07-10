# Monadage Client-Side Architecture Design

## Project Overview

**Monadage** is an image transformation application that allows users to apply artistic effects to their photos through composable pipelines. The current server-side Python implementation hosts a web interface that processes images through various artistic effects including vaporwave, glitch art, neon edge lighting, oil painting, pixel sorting, and many others.

### Current Architecture Problems
- **Cost**: Server-side processing costs ~$0.10/day in hosting fees
- **Scalability**: Python server requires compute resources for each user
- **Latency**: Images must be uploaded, processed server-side, and downloaded
- **Dependency**: Requires Python runtime and PIL/NumPy on server

### Solution: Client-Side Processing
Transform the application to run entirely in the browser using:
- **GitHub Pages** for zero-cost static hosting
- **Web Components** for modular, reusable UI architecture
- **WebGL/Canvas** for high-performance image processing
- **Web Workers** for non-blocking computation

---

## Effect Catalog

The application currently supports 19 distinct artistic effects:

### Core Effects
1. **Vaporwave** - Retro aesthetic with pink/purple gradients and grid overlays
2. **Glitch Art** - Digital corruption with pixel corruption and color channel shifts
3. **Neon Edge** - Glowing edge detection on dark backgrounds
4. **Oil Painting** - Artistic oil painting simulation
5. **Pixel Sort** - Algorithmic pixel sorting for abstract patterns
6. **Kaleidoscope** - Symmetric kaleidoscope reflections
7. **Comic Book** - Comic book style with bold outlines and flat colors
8. **ASCII Art** - Character-based text art generation

### Advanced Effects
9. **Crystal Refraction** - Crystalline light refraction simulation
10. **Liquid Metal** - Metallic liquid surface effects
11. **Paper Cutout** - Layered paper cutout appearance
12. **Digital Rain** - Matrix-style falling character effects
13. **Origami Fold** - Geometric folding patterns
14. **Fractal Spiral** - Mathematical spiral patterns
15. **Geometric Telescope** - Kaleidoscopic geometric transformations
16. **Datamosh** - Video compression artifact simulation
17. **Mosaic** - Traditional tile mosaic patterns
18. **Dynamic Mosaic** - Animated mosaic with varying tile sizes
19. **Four Corners** - Multi-perspective corner effects

---

## Technical Architecture

### Frontend Stack
- **Framework**: Vanilla JavaScript with Web Components
- **Styling**: Tailwind CSS (CDN)
- **Image Processing**: WebGL shaders + Canvas API
- **State Management**: Custom reactive state system
- **Build Process**: None required (pure static files)

### Core Components

#### 1. Image Processing Engine
```javascript
// Core image processing pipeline
class ImageProcessor {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2');
    this.shaderPrograms = new Map();
  }
  
  loadShader(vertexSource, fragmentSource) { /* ... */ }
  processImage(imageData, effectChain) { /* ... */ }
  compileShaderProgram(effectName, shaderSource) { /* ... */ }
}
```

#### 2. Effect Shader System
Each effect will be implemented as a WebGL fragment shader:

```glsl
// Example: Vaporwave effect shader
precision mediump float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_time;
varying vec2 v_texCoord;

void main() {
  vec4 color = texture2D(u_texture, v_texCoord);
  
  // Apply vaporwave color transformation
  vec3 hsv = rgb2hsv(color.rgb);
  hsv.x = mod(hsv.x + 0.8, 1.0); // Shift to pink/purple
  hsv.y = min(1.0, hsv.y * 1.5);  // Increase saturation
  hsv.z = pow(hsv.z, 0.8);        // Enhance contrast
  
  vec3 vaporwave = hsv2rgb(hsv);
  
  // Add grid overlay
  vec2 grid = mod(gl_FragCoord.xy, 20.0);
  float gridLine = step(18.0, grid.x) + step(18.0, grid.y);
  vaporwave += gridLine * 0.2;
  
  gl_FragColor = vec4(vaporwave, color.a);
}
```

#### 3. Web Component Architecture
```javascript
// Pipeline builder component
class PipelineBuilder extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.pipeline = [];
    this.render();
  }
  
  connectedCallback() {
    this.setupEventListeners();
    this.setupDragDrop();
  }
  
  addEffect(effectName) { /* ... */ }
  removeEffect(index) { /* ... */ }
  reorderEffects(fromIndex, toIndex) { /* ... */ }
}

// Effect selector component
class EffectSelector extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.effects = AVAILABLE_EFFECTS;
    this.render();
  }
  
  selectEffect(effectName) {
    this.dispatchEvent(new CustomEvent('effect-selected', {
      detail: { effectName },
      bubbles: true
    }));
  }
}
```

#### 4. Image Upload & Preview System
```javascript
class ImageUploader extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.files = [];
    this.render();
  }
  
  handleDrop(event) {
    const files = Array.from(event.dataTransfer.files)
      .filter(file => file.type.startsWith('image/'));
    this.addFiles(files);
  }
  
  addFiles(files) {
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          this.files.push({
            file,
            image: img,
            preview: e.target.result
          });
          this.render();
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }
}
```

### Image Processing Pipeline

#### 1. Shader-Based Effects
Each effect is implemented as a fragment shader that processes pixels in parallel:

```glsl
// Base shader template
precision mediump float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_time;
varying vec2 v_texCoord;

// Effect-specific uniforms
uniform float u_intensity;
uniform vec3 u_color;
uniform float u_parameter1;
uniform float u_parameter2;

void main() {
  vec4 originalColor = texture2D(u_texture, v_texCoord);
  
  // Apply effect-specific transformations
  vec4 processedColor = applyEffect(originalColor, v_texCoord);
  
  gl_FragColor = processedColor;
}
```

#### 2. Effect Chain Processing
Multiple effects are chained by rendering to intermediate framebuffers:

```javascript
class EffectChain {
  constructor(gl, effects) {
    this.gl = gl;
    this.effects = effects;
    this.framebuffers = [];
    this.setupFramebuffers();
  }
  
  process(inputTexture, outputCanvas) {
    let currentTexture = inputTexture;
    
    for (let i = 0; i < this.effects.length; i++) {
      const effect = this.effects[i];
      const isLastEffect = i === this.effects.length - 1;
      
      // Set up render target
      if (isLastEffect) {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
      } else {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffers[i]);
      }
      
      // Apply effect
      effect.render(currentTexture);
      
      // Set up for next iteration
      if (!isLastEffect) {
        currentTexture = this.framebuffers[i].texture;
      }
    }
  }
}
```

#### 3. Worker-Based Processing
For CPU-intensive effects that can't be efficiently implemented in shaders:

```javascript
// Main thread
class CPUEffectProcessor {
  constructor() {
    this.worker = new Worker('effects-worker.js');
    this.worker.onmessage = this.handleWorkerMessage.bind(this);
  }
  
  processImage(imageData, effectName, params) {
    return new Promise((resolve, reject) => {
      const id = this.generateId();
      this.pendingTasks.set(id, { resolve, reject });
      
      this.worker.postMessage({
        id,
        type: 'process',
        imageData,
        effectName,
        params
      });
    });
  }
}

// Worker thread (effects-worker.js)
self.onmessage = function(event) {
  const { id, type, imageData, effectName, params } = event.data;
  
  if (type === 'process') {
    const result = processEffect(imageData, effectName, params);
    self.postMessage({ id, result });
  }
};
```

### Application State Management

#### 1. Reactive State System
```javascript
class ReactiveState {
  constructor(initialState) {
    this.state = initialState;
    this.listeners = new Set();
    this.proxy = new Proxy(this.state, {
      set: (target, key, value) => {
        target[key] = value;
        this.notify();
        return true;
      }
    });
  }
  
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  notify() {
    this.listeners.forEach(listener => listener(this.state));
  }
}

// Application state
const appState = new ReactiveState({
  images: [],
  pipeline: [],
  processing: false,
  results: []
});
```

#### 2. State Synchronization
```javascript
class StateManager {
  constructor() {
    this.state = appState;
    this.setupURLSync();
  }
  
  setupURLSync() {
    // Sync pipeline to URL
    this.state.subscribe(state => {
      const pipeline = state.pipeline.map(effect => effect.name).join(',');
      const url = new URL(window.location);
      url.searchParams.set('pipeline', pipeline);
      window.history.replaceState({}, '', url);
    });
    
    // Load pipeline from URL
    const urlParams = new URLSearchParams(window.location.search);
    const pipelineParam = urlParams.get('pipeline');
    if (pipelineParam) {
      this.state.pipeline = pipelineParam.split(',').map(name => ({
        name,
        params: {}
      }));
    }
  }
}
```

### Performance Optimizations

#### 1. Lazy Loading
- Load shader programs only when needed
- Implement viewport-based rendering for large images
- Use progressive image loading

#### 2. Memory Management
- Implement texture pooling to reuse WebGL textures
- Clean up intermediate framebuffers
- Use canvas transfer to offscreen contexts

#### 3. Caching Strategy
- Cache compiled shader programs
- Cache intermediate processing results
- Use Service Worker for offline capability

---

## File Structure

```
monadage-client/
├── index.html                 # Main application entry point
├── styles/
│   └── main.css              # Custom styles (minimal, mostly Tailwind)
├── scripts/
│   ├── main.js               # Application initialization
│   ├── components/
│   │   ├── image-uploader.js
│   │   ├── pipeline-builder.js
│   │   ├── effect-selector.js
│   │   └── result-viewer.js
│   ├── effects/
│   │   ├── base-effect.js
│   │   ├── vaporwave.js
│   │   ├── glitch-art.js
│   │   ├── neon-edge.js
│   │   └── [other effects...]
│   ├── processors/
│   │   ├── webgl-processor.js
│   │   ├── canvas-processor.js
│   │   └── worker-processor.js
│   └── utils/
│       ├── state-manager.js
│       ├── image-utils.js
│       └── shader-utils.js
├── shaders/
│   ├── vertex.glsl
│   └── fragments/
│       ├── vaporwave.glsl
│       ├── glitch-art.glsl
│       ├── neon-edge.glsl
│       └── [other shaders...]
├── workers/
│   └── effects-worker.js
├── examples/
│   └── [example images...]
└── manifest.json             # PWA manifest
```

---

## Implementation Strategy

### Phase 1: Core Infrastructure (Week 1)
1. Set up static file structure
2. Implement basic Web Components
3. Create WebGL image processing pipeline
4. Implement 3-5 core effects (vaporwave, glitch art, neon edge, oil painting, pixel sort)

### Phase 2: Effect Implementation (Week 2)
1. Convert remaining Python effects to WebGL shaders
2. Implement complex effects requiring CPU processing
3. Add effect parameter controls
4. Create effect preview system

### Phase 3: UI/UX Polish (Week 3)
1. Implement drag-and-drop pipeline builder
2. Add effect thumbnails and previews
3. Create responsive design for mobile
4. Add loading states and progress indicators

### Phase 4: Optimization & PWA (Week 4)
1. Implement Service Worker for offline support
2. Add performance monitoring
3. Optimize for large images
4. Add export options (PNG, JPG, WebP)

---

## Technical Challenges & Solutions

### Challenge 1: Complex Effects Translation
**Problem**: Some Python effects use complex algorithms that don't translate directly to shaders.
**Solution**: Implement hybrid approach using Web Workers for CPU-intensive operations, with results passed to GPU for final compositing.

### Challenge 2: Memory Management
**Problem**: Large images can exhaust GPU memory.
**Solution**: Implement tiled processing for large images, processing regions sequentially and compositing results.

### Challenge 3: Browser Compatibility
**Problem**: WebGL 2 features may not be available on all browsers.
**Solution**: Implement fallback to WebGL 1 or Canvas 2D for unsupported features, with graceful degradation.

### Challenge 4: Performance on Mobile
**Problem**: Mobile devices have limited GPU capabilities.
**Solution**: Implement adaptive quality settings, reducing effect complexity on lower-end devices.

---

## Benefits of Client-Side Architecture

### Cost Savings
- **Zero hosting costs** with GitHub Pages
- **No server maintenance** required
- **Infinite scalability** without infrastructure costs

### Performance Benefits
- **No upload/download latency** - images never leave the browser
- **Parallel processing** - multiple effects can be processed simultaneously
- **Instant feedback** - real-time effect previews

### User Experience
- **Offline capability** - works without internet connection
- **Privacy** - images never uploaded to servers
- **Responsiveness** - immediate feedback on effect changes

### Development Benefits
- **Simplified deployment** - just commit and push to GitHub
- **No server dependencies** - easier to maintain and update
- **Better debugging** - all code runs in developer tools

---

## Future Enhancements

### Advanced Features
- **Real-time video processing** using WebRTC
- **AI-powered effects** using TensorFlow.js
- **Custom shader editor** for user-created effects
- **Batch processing** for multiple images

### Integration Possibilities
- **Social sharing** direct from browser
- **Cloud storage** integration (Google Drive, Dropbox)
- **Plugin system** for third-party effects
- **Mobile app** using Capacitor/Cordova

This architecture provides a solid foundation for a completely client-side image processing application that eliminates hosting costs while providing superior performance and user experience.