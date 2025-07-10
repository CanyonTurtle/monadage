precision mediump float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_time;
varying vec2 v_texCoord;

// Random function
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// Digital noise
float digitalNoise(vec2 uv) {
    vec2 i = floor(uv);
    vec2 f = fract(uv);
    
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    
    vec2 u = f * f * (3.0 - 2.0 * f);
    
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void main() {
    vec2 uv = v_texCoord;
    
    // Add horizontal displacement for datamosh effect
    float displaceStrength = 0.02;
    float displace = (digitalNoise(vec2(uv.y * 10.0, u_time * 0.5)) - 0.5) * displaceStrength;
    uv.x += displace;
    
    // Sample RGB channels with slight offsets (chromatic aberration)
    float aberration = 0.005;
    float r = texture2D(u_texture, uv + vec2(aberration, 0.0)).r;
    float g = texture2D(u_texture, uv).g;
    float b = texture2D(u_texture, uv - vec2(aberration, 0.0)).b;
    
    vec3 color = vec3(r, g, b);
    
    // Add digital corruption
    float corruption = digitalNoise(uv * 50.0 + u_time);
    if (corruption > 0.95) {
        color = vec3(random(uv + u_time), random(uv + u_time + 1.0), random(uv + u_time + 2.0));
    }
    
    // Add scan lines
    float scanline = sin(gl_FragCoord.y * 0.8) * 0.3;
    color *= (1.0 - scanline);
    
    // Quantize colors for posterized effect
    color = floor(color * 6.0) / 6.0;
    
    // Add block corruption
    vec2 blockUV = floor(uv * 20.0) / 20.0;
    float blockNoise = digitalNoise(blockUV + u_time * 0.1);
    if (blockNoise > 0.8) {
        vec2 offset = vec2(
            (random(blockUV) - 0.5) * 0.1,
            (random(blockUV + 1.0) - 0.5) * 0.1
        );
        color = texture2D(u_texture, uv + offset).rgb;
    }
    
    // Boost contrast
    color = pow(color, vec3(1.2));
    
    gl_FragColor = vec4(color, 1.0);
}