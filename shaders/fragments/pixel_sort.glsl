precision mediump float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_threshold; // Sorting threshold (default: 0.5)
varying vec2 v_texCoord;

// Convert RGB to luminance
float luminance(vec3 color) {
    return dot(color, vec3(0.299, 0.587, 0.114));
}

// Pseudo-random function for sorting direction
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
    vec2 texelSize = 1.0 / u_resolution;
    vec4 originalColor = texture2D(u_texture, v_texCoord);
    
    // Determine sorting direction based on position and time
    float directionNoise = random(floor(v_texCoord * 20.0) / 20.0 + u_time * 0.1);
    bool sortHorizontally = directionNoise > 0.5;
    
    vec3 sortedColor = originalColor.rgb;
    float originalLum = luminance(originalColor.rgb);
    
    // Only sort if pixel meets threshold criteria
    if (originalLum > u_threshold) {
        int sortLength = 8;
        vec3 samples[8];
        float luminances[8];
        
        // Collect samples for sorting
        for (int i = 0; i < 8; i++) {
            vec2 offset;
            if (sortHorizontally) {
                offset = vec2(float(i - 4) * texelSize.x, 0.0);
            } else {
                offset = vec2(0.0, float(i - 4) * texelSize.y);
            }
            
            vec2 sampleUV = v_texCoord + offset;
            samples[i] = texture2D(u_texture, sampleUV).rgb;
            luminances[i] = luminance(samples[i]);
        }
        
        // Simple selection sort (unrolled for WebGL compatibility)
        // Note: This is a simplified version due to WebGL loop limitations
        vec3 minSample = samples[0];
        vec3 maxSample = samples[0];
        float minLum = luminances[0];
        float maxLum = luminances[0];
        
        // Find min and max
        for (int i = 1; i < 8; i++) {
            if (luminances[i] < minLum) {
                minLum = luminances[i];
                minSample = samples[i];
            }
            if (luminances[i] > maxLum) {
                maxLum = luminances[i];
                maxSample = samples[i];
            }
        }
        
        // Use interpolation based on original luminance position
        float t = (originalLum - minLum) / (maxLum - minLum + 0.001);
        t = clamp(t, 0.0, 1.0);
        
        // Apply smooth sorting effect
        sortedColor = mix(minSample, maxSample, t);
        
        // Add some variation based on neighboring pixels
        vec3 neighbor1, neighbor2;
        if (sortHorizontally) {
            neighbor1 = texture2D(u_texture, v_texCoord + vec2(-texelSize.x, 0.0)).rgb;
            neighbor2 = texture2D(u_texture, v_texCoord + vec2(texelSize.x, 0.0)).rgb;
        } else {
            neighbor1 = texture2D(u_texture, v_texCoord + vec2(0.0, -texelSize.y)).rgb;
            neighbor2 = texture2D(u_texture, v_texCoord + vec2(0.0, texelSize.y)).rgb;
        }
        
        float neighbor1Lum = luminance(neighbor1);
        float neighbor2Lum = luminance(neighbor2);
        
        // Blend with neighbors based on luminance similarity
        float similarity1 = 1.0 - abs(originalLum - neighbor1Lum);
        float similarity2 = 1.0 - abs(originalLum - neighbor2Lum);
        
        sortedColor = mix(sortedColor, neighbor1, similarity1 * 0.1);
        sortedColor = mix(sortedColor, neighbor2, similarity2 * 0.1);
    }
    
    // Add some glitch-like artifacts for more interesting sorting
    float glitchNoise = random(v_texCoord + u_time * 0.01);
    if (glitchNoise > 0.98) {
        // Horizontal displacement
        vec2 displacedUV = v_texCoord + vec2((glitchNoise - 0.99) * 0.1, 0.0);
        sortedColor = texture2D(u_texture, displacedUV).rgb;
    }
    
    // Enhance contrast slightly
    sortedColor = pow(sortedColor, vec3(1.1));
    
    gl_FragColor = vec4(sortedColor, originalColor.a);
}