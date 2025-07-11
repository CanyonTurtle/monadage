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

// Smooth noise function
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
    
    for (int i = 0; i < 3; i++) {
        value += amplitude * noise(st);
        st *= 2.0;
        amplitude *= 0.5;
    }
    
    return value;
}

// Gentle paper texture
float paperTexture(vec2 uv) {
    float paper = fbm(uv * 8.0) * 0.1 + 0.95;
    paper += noise(uv * 50.0) * 0.05;
    return paper;
}

// Enhanced color bleeding
vec3 softBleeding(vec2 uv, float strength) {
    vec3 center = texture2D(u_texture, uv).rgb;
    vec3 sum = center * 2.0;
    float total = 2.0;
    
    // Multiple rings of bleeding for stronger effect
    for (int ring = 1; ring <= 3; ring++) {
        float ringOffset = strength * 0.008 * float(ring);
        float ringWeight = 1.0 / float(ring);
        
        // 8-direction sampling for each ring
        for (int i = 0; i < 8; i++) {
            float angle = float(i) * 3.14159 * 2.0 / 8.0;
            vec2 offset = vec2(cos(angle), sin(angle)) * ringOffset;
            
            vec3 sample_color = texture2D(u_texture, uv + offset).rgb;
            sum += sample_color * ringWeight;
            total += ringWeight;
        }
    }
    
    // Additional close samples for intense bleeding
    float closeOffset = strength * 0.004;
    sum += texture2D(u_texture, uv + vec2(closeOffset, 0.0)).rgb * 2.0;
    sum += texture2D(u_texture, uv - vec2(closeOffset, 0.0)).rgb * 2.0;
    sum += texture2D(u_texture, uv + vec2(0.0, closeOffset)).rgb * 2.0;
    sum += texture2D(u_texture, uv - vec2(0.0, closeOffset)).rgb * 2.0;
    total += 8.0;
    
    return sum / total;
}

// Watercolor flow distortion
vec2 getFlowDistortion(vec2 uv) {
    float flow1 = fbm(uv * 3.0 + u_time * 0.02);
    float flow2 = fbm(uv * 2.5 + vec2(100.0) + u_time * 0.015);
    
    return vec2(flow1 - 0.5, flow2 - 0.5) * u_flow_strength * 0.008;
}

void main() {
    vec2 uv = v_texCoord;
    
    // Apply gentle flow distortion
    vec2 flowOffset = getFlowDistortion(uv);
    vec2 distortedUV = uv + flowOffset;
    
    // Get base color with soft bleeding
    vec3 color = softBleeding(distortedUV, u_color_bleeding);
    
    // Paper texture (very subtle)
    float paper = paperTexture(uv);
    color *= mix(1.0, paper, u_paper_texture * 0.3);
    
    // Brush stroke texture (subtle)
    float brushNoise = fbm(uv * 10.0 * u_brush_size);
    brushNoise = smoothstep(0.3, 0.7, brushNoise);
    color = mix(color * 0.95, color, brushNoise);
    
    // Gentle saturation boost for watercolor vibrancy
    float luminance = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(vec3(luminance), color, 1.1);
    
    // Soft color variations
    float colorVariation = noise(uv * 20.0) * 0.02;
    color += vec3(colorVariation);
    
    // Ensure valid range
    color = clamp(color, 0.0, 1.0);
    
    gl_FragColor = vec4(color, 1.0);
}