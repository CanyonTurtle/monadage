precision mediump float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_brush_size;
uniform float u_flow_strength;
uniform float u_paper_texture;
uniform float u_color_bleeding;
varying vec2 v_texCoord;

// Random function
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// Improved noise function
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

// Fractal Brownian Motion for organic texture
float fbm(vec2 st) {
    float value = 0.0;
    float amplitude = 0.5;
    
    for (int i = 0; i < 4; i++) {
        value += amplitude * noise(st);
        st *= 2.0;
        amplitude *= 0.5;
    }
    
    return value;
}

// Paper texture simulation
float paperTexture(vec2 uv) {
    return fbm(uv * 50.0) * 0.3 + 0.7;
}

// Watercolor bleeding effect
vec3 colorBleeding(vec2 uv, float radius) {
    vec3 sum = vec3(0.0);
    float total = 0.0;
    
    for (int x = -2; x <= 2; x++) {
        for (int y = -2; y <= 2; y++) {
            vec2 offset = vec2(float(x), float(y)) * radius / u_resolution;
            float weight = 1.0 - length(vec2(x, y)) / 3.0;
            weight = max(weight, 0.0);
            
            vec3 sample_color = texture2D(u_texture, uv + offset).rgb;
            sum += sample_color * weight;
            total += weight;
        }
    }
    
    return sum / total;
}

// Edge detection for brush stroke direction
vec2 getEdgeDirection(vec2 uv) {
    float texelSize = 1.0 / max(u_resolution.x, u_resolution.y);
    
    vec3 left = texture2D(u_texture, uv - vec2(texelSize, 0.0)).rgb;
    vec3 right = texture2D(u_texture, uv + vec2(texelSize, 0.0)).rgb;
    vec3 up = texture2D(u_texture, uv - vec2(0.0, texelSize)).rgb;
    vec3 down = texture2D(u_texture, uv + vec2(0.0, texelSize)).rgb;
    
    float dx = length(right - left);
    float dy = length(down - up);
    
    return normalize(vec2(dx, dy));
}

void main() {
    vec2 uv = v_texCoord;
    
    // Base color with bleeding effect
    vec3 baseColor = colorBleeding(uv, u_color_bleeding * 3.0);
    
    // Paper texture
    float paper = paperTexture(uv);
    
    // Brush stroke simulation
    vec2 edgeDir = getEdgeDirection(uv);
    float brushNoise = fbm(uv * 20.0 + edgeDir * u_flow_strength);
    
    // Create watercolor flow patterns
    vec2 flowDir = vec2(
        sin(uv.x * 10.0 + u_time * 0.1) + cos(uv.y * 15.0),
        cos(uv.x * 12.0 + u_time * 0.15) + sin(uv.y * 8.0)
    ) * u_flow_strength * 0.01;
    
    vec3 flowColor = texture2D(u_texture, uv + flowDir).rgb;
    
    // Mix base color with flow for water movement effect
    vec3 color = mix(baseColor, flowColor, 0.3);
    
    // Brush texture overlay
    float brushTexture = fbm(uv * 30.0 * u_brush_size);
    brushTexture = smoothstep(0.3, 0.7, brushTexture);
    
    // Apply brush strokes
    color = mix(color * 0.7, color, brushTexture);
    
    // Watercolor transparency simulation
    float luminance = dot(color, vec3(0.299, 0.587, 0.114));
    float transparency = smoothstep(0.1, 0.9, luminance);
    
    // Soft color transitions
    color = mix(color, vec3(0.95, 0.95, 0.9), (1.0 - transparency) * 0.2);
    
    // Apply paper texture
    color *= paper;
    
    // Color saturation boost for watercolor vibrancy
    float gray = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(vec3(gray), color, 1.2);
    
    // Simple edge detection using neighboring pixels
    float texelSize = 1.0 / max(u_resolution.x, u_resolution.y);
    vec3 center = texture2D(u_texture, uv).rgb;
    vec3 left = texture2D(u_texture, uv - vec2(texelSize, 0.0)).rgb;
    vec3 right = texture2D(u_texture, uv + vec2(texelSize, 0.0)).rgb;
    vec3 up = texture2D(u_texture, uv - vec2(0.0, texelSize)).rgb;
    vec3 down = texture2D(u_texture, uv + vec2(0.0, texelSize)).rgb;
    
    float edgeStrength = length(center - left) + length(center - right) + 
                        length(center - up) + length(center - down);
    
    if (edgeStrength > 0.2) {
        vec3 bleedColor = colorBleeding(uv, u_color_bleeding * 5.0);
        color = mix(color, bleedColor, 0.3 * u_color_bleeding);
    }
    
    // Soft, slightly desaturated final color
    color = mix(color, vec3(gray), 0.1);
    
    gl_FragColor = vec4(color, 1.0);
}