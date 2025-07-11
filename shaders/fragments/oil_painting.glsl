precision mediump float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_intensity; // Brush size multiplier (default: 1.0)
varying vec2 v_texCoord;

// Oil painting effect using statistical approach with fixed loops
void main() {
    vec2 texelSize = 1.0 / u_resolution;
    float radius = 4.0 * u_intensity;
    
    vec3 finalColor = vec3(0.0);
    float maxIntensity = 0.0;
    
    // For each intensity level (fixed loop)
    for (int level = 0; level < 20; level++) {
        vec3 levelSum = vec3(0.0);
        float levelCount = 0.0;
        float targetIntensity = float(level) / 20.0;
        
        // Sample surrounding pixels within radius (fixed loops)
        for (int x = -8; x <= 8; x++) {
            for (int y = -8; y <= 8; y++) {
                float fx = float(x);
                float fy = float(y);
                
                // Check if within dynamic radius
                if (length(vec2(fx, fy)) > radius) continue;
                
                vec2 offset = vec2(fx, fy) * texelSize;
                vec2 sampleUV = v_texCoord + offset;
                
                // Sample pixel
                vec4 sampleColor = texture2D(u_texture, sampleUV);
                float intensity = (sampleColor.r + sampleColor.g + sampleColor.b) / 3.0;
                
                // Check if this pixel belongs to current level
                float levelDiff = abs(intensity - targetIntensity);
                if (levelDiff < 0.05) { // 1.0 / 20.0 = 0.05
                    levelSum += sampleColor.rgb;
                    levelCount += 1.0;
                }
            }
        }
        
        // Calculate average for this level
        if (levelCount > 0.0) {
            vec3 levelAverage = levelSum / levelCount;
            
            // Use the level with highest count (most representative)
            if (levelCount > maxIntensity) {
                maxIntensity = levelCount;
                finalColor = levelAverage;
            }
        }
    }
    
    // Quantize colors for painterly effect
    finalColor = floor(finalColor * 8.0) / 8.0;
    
    // Enhance saturation slightly
    vec3 gray = vec3((finalColor.r + finalColor.g + finalColor.b) / 3.0);
    finalColor = mix(gray, finalColor, 1.2);
    
    // Add slight texture variation
    float noise = fract(sin(dot(v_texCoord * 100.0, vec2(12.9898, 78.233))) * 43758.5453);
    finalColor += (noise - 0.5) * 0.02;
    
    gl_FragColor = vec4(finalColor, 1.0);
}