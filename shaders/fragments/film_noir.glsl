precision mediump float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_contrast;
uniform float u_shadow_depth;
uniform float u_highlight_intensity;
uniform float u_grain_amount;
varying vec2 v_texCoord;

// Random function
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// Film grain noise
float filmGrain(vec2 uv, float time) {
    return random(uv + fract(time * 0.01)) * 2.0 - 1.0;
}

// Vignette effect
float vignette(vec2 uv) {
    vec2 center = vec2(0.5, 0.5);
    float dist = distance(uv, center);
    return 1.0 - smoothstep(0.5, 1.0, dist) * 0.3;
}

// Simple contrast adjustment
float adjustContrast(float value, float contrast) {
    return clamp((value - 0.5) * (1.0 + contrast) + 0.5, 0.0, 1.0);
}

void main() {
    vec2 uv = v_texCoord;
    
    // Original color
    vec3 color = texture2D(u_texture, uv).rgb;
    
    // Convert to grayscale
    float gray = dot(color, vec3(0.299, 0.587, 0.114));
    
    // Apply contrast
    gray = adjustContrast(gray, u_contrast * 0.5);
    
    // Start with grayscale
    color = vec3(gray);
    
    // Enhance shadows
    if (gray < 0.5) {
        color *= 1.0 - u_shadow_depth * 0.3;
    }
    
    // Enhance highlights
    if (gray > 0.7) {
        color += vec3(0.1) * u_highlight_intensity * 0.3;
    }
    
    // Add film grain
    float grain = filmGrain(uv * 100.0, u_time) * u_grain_amount * 0.03;
    color += vec3(grain);
    
    // Apply subtle vignette
    float vignetteAmount = vignette(uv);
    color *= vignetteAmount;
    
    // Ensure we stay in valid range
    color = clamp(color, 0.0, 1.0);
    
    gl_FragColor = vec4(color, 1.0);
}