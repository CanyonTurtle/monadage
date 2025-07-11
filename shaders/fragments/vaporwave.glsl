precision mediump float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_time;

// Configurable parameters
uniform float u_quantization_levels; // Number of color levels (default: 8.0)
uniform float u_grid_size;           // Grid spacing in pixels (default: 20.0)
uniform float u_hue_shift;           // Hue shift amount (default: 0.8)
uniform float u_saturation_boost;    // Saturation multiplier (default: 1.5)

varying vec2 v_texCoord;

// HSV conversion functions (accurate)
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

// Stronger quantization function matching PIL's quantize behavior
vec3 quantize(vec3 color, float levels) {
    return floor(color * (levels - 1.0) + 0.5) / (levels - 1.0);
}

void main() {
    vec4 originalColor = texture2D(u_texture, v_texCoord);
    
    // Step 1: Apply vaporwave color transformation (HSV)
    vec3 hsv = rgb2hsv(originalColor.rgb);
    
    // Configurable hue shift (default matches Python: 0.8)
    hsv.x = mod(hsv.x + u_hue_shift, 1.0);
    // Configurable saturation boost (default matches Python: 1.5)
    hsv.y = min(1.0, hsv.y * u_saturation_boost);
    // Exact match: v = v ** 0.8
    hsv.z = pow(hsv.z, 0.8);
    
    vec3 vaporwaveColor = hsv2rgb(hsv);
    
    // Step 2: Add grid overlay with configurable spacing
    // Python: data[:, x] = np.minimum(data[:, x] + 50, 255) every grid_size pixels
    vec2 pixelCoord = v_texCoord * u_resolution;
    bool isGridLine = (mod(pixelCoord.x, u_grid_size) < 1.0) || (mod(pixelCoord.y, u_grid_size) < 1.0);
    
    if (isGridLine) {
        // Use modular arithmetic to create visible grid lines even on bright areas
        vaporwaveColor = mod(vaporwaveColor + (50.0 / 255.0), 1.0);
    }
    
    // Step 3: Enhance contrast and saturation (matching PIL ImageEnhance)
    // Contrast enhancement: 1.3x
    vec3 gray = vec3(0.299, 0.587, 0.114);
    float luminance = dot(vaporwaveColor, gray);
    vaporwaveColor = mix(vec3(luminance), vaporwaveColor, 1.3);
    
    // Color/saturation enhancement: 1.5x
    luminance = dot(vaporwaveColor, gray);
    vaporwaveColor = mix(vec3(luminance), vaporwaveColor, 1.5);
    
    // Step 4: Quantize with configurable levels
    vaporwaveColor = quantize(vaporwaveColor, u_quantization_levels);
    
    // Ensure we stay in valid range
    vaporwaveColor = clamp(vaporwaveColor, 0.0, 1.0);
    
    gl_FragColor = vec4(vaporwaveColor, originalColor.a);
}