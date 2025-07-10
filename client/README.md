# Monadage Client-Side

Transform your images with artistic effects entirely in your browser!

## Features

- **100% Client-Side**: Your images never leave your device
- **19+ Artistic Effects**: Vaporwave, Glitch Art, Neon Edge, Oil Painting, and more
- **Composable Pipelines**: Chain multiple effects together
- **WebGL Accelerated**: High-performance GPU processing
- **Real-time Preview**: See effects as you build your pipeline
- **Zero Cost Hosting**: Runs on GitHub Pages for free
- **Works Offline**: Functions without internet once loaded
- **No Limits**: No file size or processing restrictions

## Effects Available

### Artistic Effects
- **Vaporwave**: Retro aesthetic with pink/purple gradients and grid overlays
- **Glitch Art**: Digital corruption with pixel corruption and color channel shifts  
- **Neon Edge**: Glowing edge detection on dark backgrounds
- **Oil Painting**: Artistic oil painting simulation with brush strokes
- **Pixel Sort**: Algorithmic pixel sorting for abstract patterns

### More Effects (Coming Soon)
- Kaleidoscope, Comic Book, ASCII Art
- Crystal Refraction, Liquid Metal, Paper Cutout
- Digital Rain, Origami Fold, Fractal Spiral
- And many more!

## Usage

1. **Upload Images**: Drag & drop or click to upload your photos
2. **Build Pipeline**: Add effects in the order you want them applied
3. **Adjust Parameters**: Fine-tune effect settings with sliders
4. **Transform**: Click "Transform My Photos" to process
5. **Download**: Save your transformed images

## Keyboard Shortcuts

- `Ctrl/Cmd + O`: Open file browser
- `Ctrl/Cmd + Enter`: Process images  
- `Ctrl/Cmd + R`: Clear results
- `Escape`: Close modals/clear errors

## Technical Details

### Architecture
- **Frontend**: Vanilla JavaScript with Web Components
- **Styling**: Tailwind CSS
- **Image Processing**: WebGL 2.0 shaders
- **State Management**: Custom reactive system
- **Build Process**: None required (pure static files)

### Browser Requirements
- Modern browser with WebGL support
- Chrome 56+, Firefox 51+, Safari 15+, Edge 79+
- Mobile browsers supported

### File Structure
```
client/
├── index.html              # Main application
├── scripts/
│   ├── main.js             # Application entry point
│   ├── components/         # Web Components
│   ├── processors/         # Image processing engine
│   └── utils/              # State management & utilities
├── shaders/
│   └── fragments/          # WebGL effect shaders
├── styles/
│   └── main.css           # Custom styles
└── manifest.json          # PWA manifest
```

## Development

### Running Locally
Since this is a static site, you can serve it with any web server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve .

# Using PHP
php -S localhost:8000
```

Then open http://localhost:8000

### Adding New Effects

1. Create a WebGL fragment shader in `shaders/fragments/effect_name.glsl`
2. Add effect definition to `availableEffects` in `state-manager.js`
3. Update the shader loading in `image-processor.js`

### Shader Development

Effects are implemented as WebGL fragment shaders. Each shader receives:

- `u_texture`: Input image texture
- `u_resolution`: Canvas resolution  
- `u_time`: Current time for animations
- `v_texCoord`: Texture coordinates (0-1)

Example shader:
```glsl
precision mediump float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
varying vec2 v_texCoord;

void main() {
    vec4 color = texture2D(u_texture, v_texCoord);
    // Apply your effect here
    gl_FragColor = color;
}
```

## Deployment

### GitHub Pages
1. Push to GitHub repository
2. Enable GitHub Pages in repository settings
3. Select source as `main` branch
4. Your site will be available at `https://username.github.io/repository`

### Other Static Hosts
- Netlify: Drag & drop the `client/` folder
- Vercel: Connect GitHub repository  
- Surge.sh: `surge client/`

## Performance

- **WebGL Processing**: GPU-accelerated effects
- **Memory Management**: Automatic texture cleanup
- **Large Images**: Adaptive processing for different image sizes
- **Mobile Optimized**: Touch-friendly interface

## Browser Compatibility

| Browser | Version | WebGL | Status |
|---------|---------|-------|--------|
| Chrome  | 56+     | ✅     | Full Support |
| Firefox | 51+     | ✅     | Full Support |
| Safari  | 15+     | ✅     | Full Support |
| Edge    | 79+     | ✅     | Full Support |
| Mobile  | Modern  | ✅     | Supported |

## License

MIT License - See LICENSE file for details

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add your effect/improvement
4. Test thoroughly
5. Submit a pull request

## Support

- Check browser console for errors
- Ensure WebGL is enabled
- Try different image formats
- Report issues on GitHub

---

**Made with ❤️ for creative image transformation**