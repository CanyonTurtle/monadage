precision mediump float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_time;
varying vec2 v_texCoord;

// HSV conversion functions
vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
    vec4 originalColor = texture2D(u_texture, v_texCoord);
    
    // Convert to HSV for color manipulation
    vec3 hsv = rgb2hsv(originalColor.rgb);
    
    // Apply vaporwave color transformation
    hsv.x = mod(hsv.x + 0.8, 1.0);    // Shift hue towards pink/purple
    hsv.y = min(1.0, hsv.y * 1.5);    // Increase saturation
    hsv.z = pow(hsv.z, 0.8);          // Enhance contrast
    
    vec3 vaporwaveColor = hsv2rgb(hsv);
    
    // Add grid overlay
    vec2 grid = mod(gl_FragCoord.xy, 20.0);
    float gridIntensity = step(18.0, grid.x) + step(18.0, grid.y);
    gridIntensity = min(gridIntensity, 1.0);
    
    // Blend grid with base color
    vaporwaveColor = mix(vaporwaveColor, vaporwaveColor + vec3(0.2, 0.1, 0.3), gridIntensity * 0.6);
    
    // Add subtle scanlines
    float scanline = sin(gl_FragCoord.y * 0.1) * 0.05;
    vaporwaveColor += scanline;
    
    // Add slight chromatic aberration for retro feel
    vec2 offset = vec2(0.002, 0.0);
    float r = texture2D(u_texture, v_texCoord + offset).r;
    float b = texture2D(u_texture, v_texCoord - offset).b;
    vaporwaveColor.r = mix(vaporwaveColor.r, r, 0.3);
    vaporwaveColor.b = mix(vaporwaveColor.b, b, 0.3);
    
    gl_FragColor = vec4(vaporwaveColor, originalColor.a);
}