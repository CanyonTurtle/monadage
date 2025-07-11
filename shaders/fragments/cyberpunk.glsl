precision mediump float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_scan_intensity;
uniform float u_contrast;
uniform float u_neon_glow;
uniform float u_chromatic_shift;
varying vec2 v_texCoord;

// Random function
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// Noise function
float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    
    vec2 u = f * f * (3.0 - 2.0 * f);
    
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

// Convert RGB to HSV
vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
    
    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

// Convert HSV to RGB
vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
    vec2 uv = v_texCoord;
    
    // Chromatic aberration
    float aberration = u_chromatic_shift * 0.01;
    float r = texture2D(u_texture, uv + vec2(aberration, 0.0)).r;
    float g = texture2D(u_texture, uv).g;
    float b = texture2D(u_texture, uv - vec2(aberration, 0.0)).b;
    
    vec3 color = vec3(r, g, b);
    
    // Boost contrast
    color = pow(color, vec3(1.0 / (1.0 + u_contrast * 0.5)));
    color = (color - 0.5) * (1.0 + u_contrast) + 0.5;
    color = clamp(color, 0.0, 1.0);
    
    // Convert to HSV for color manipulation
    vec3 hsv = rgb2hsv(color);
    
    // Shift towards cyan/magenta cyberpunk palette
    hsv.x = hsv.x + sin(u_time * 0.1) * 0.1;
    if (hsv.z > 0.5) {
        // Bright areas: push towards cyan/magenta
        hsv.x = hsv.x * 0.8 + 0.5 + sin(hsv.z * 10.0) * 0.1;
    } else {
        // Dark areas: push towards blue
        hsv.x = hsv.x * 0.6 + 0.6;
    }
    
    // Boost saturation for neon effect
    hsv.y = min(hsv.y * (1.0 + u_neon_glow), 1.0);
    
    color = hsv2rgb(hsv);
    
    // Scan lines
    float scanLine = sin(gl_FragCoord.y * 2.0) * 0.5 + 0.5;
    scanLine = pow(scanLine, 3.0);
    color *= (1.0 - u_scan_intensity * 0.3 * (1.0 - scanLine));
    
    // Moving scan line effect
    float movingScan = sin((gl_FragCoord.y + u_time * 50.0) * 0.1);
    if (movingScan > 0.98) {
        color += vec3(0.0, 0.3, 0.8) * u_scan_intensity;
    }
    
    // Digital noise
    float digitalNoise = noise(uv * 100.0 + u_time);
    if (digitalNoise > 0.95) {
        color = mix(color, vec3(0.0, 1.0, 1.0), 0.3 * u_scan_intensity);
    }
    
    // Grid overlay
    vec2 grid = fract(uv * 50.0);
    if (grid.x < 0.05 || grid.y < 0.05) {
        color += vec3(0.0, 0.2, 0.4) * u_neon_glow * 0.5;
    }
    
    // Darken overall for cyberpunk mood
    color *= 0.8;
    
    // Add subtle blue tint to shadows
    vec3 shadows = vec3(0.1, 0.2, 0.4);
    float luminance = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(shadows, color, smoothstep(0.0, 0.5, luminance));
    
    gl_FragColor = vec4(color, 1.0);
}