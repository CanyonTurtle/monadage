precision mediump float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_time;
varying vec2 v_texCoord;

// Edge detection using Sobel operator
float sobel(sampler2D tex, vec2 uv, vec2 texelSize) {
    float tl = length(texture2D(tex, uv + vec2(-texelSize.x, -texelSize.y)).rgb);
    float tm = length(texture2D(tex, uv + vec2(0.0, -texelSize.y)).rgb);
    float tr = length(texture2D(tex, uv + vec2(texelSize.x, -texelSize.y)).rgb);
    float ml = length(texture2D(tex, uv + vec2(-texelSize.x, 0.0)).rgb);
    float mr = length(texture2D(tex, uv + vec2(texelSize.x, 0.0)).rgb);
    float bl = length(texture2D(tex, uv + vec2(-texelSize.x, texelSize.y)).rgb);
    float bm = length(texture2D(tex, uv + vec2(0.0, texelSize.y)).rgb);
    float br = length(texture2D(tex, uv + vec2(texelSize.x, texelSize.y)).rgb);
    
    float sobelX = (tr + 2.0 * mr + br) - (tl + 2.0 * ml + bl);
    float sobelY = (bl + 2.0 * bm + br) - (tl + 2.0 * tm + tr);
    
    return sqrt(sobelX * sobelX + sobelY * sobelY);
}

void main() {
    vec2 texelSize = 1.0 / u_resolution;
    vec4 originalColor = texture2D(u_texture, v_texCoord);
    
    // Detect edges
    float edge = sobel(u_texture, v_texCoord, texelSize);
    edge = smoothstep(0.1, 0.3, edge);
    
    // Create dark background
    vec3 darkened = originalColor.rgb * 0.2;
    darkened.b += 0.08; // Add slight blue tint
    
    // Create neon colors
    vec3 cyanGlow = vec3(0.0, 1.0, 1.0);
    vec3 magentaGlow = vec3(1.0, 0.0, 1.0);
    vec3 yellowGlow = vec3(1.0, 1.0, 0.2);
    
    // Multi-layer glow effect
    float glow1 = edge;
    float glow2 = 0.0;
    float glow3 = 0.0;
    
    // Sample surrounding pixels for glow layers
    for (float i = -2.0; i <= 2.0; i += 1.0) {
        for (float j = -2.0; j <= 2.0; j += 1.0) {
            if (i == 0.0 && j == 0.0) continue;
            
            vec2 offset = vec2(i, j) * texelSize;
            float dist = length(vec2(i, j));
            float sampleEdge = sobel(u_texture, v_texCoord + offset, texelSize);
            sampleEdge = smoothstep(0.1, 0.3, sampleEdge);
            
            if (dist <= 1.5) {
                glow2 += sampleEdge * 0.3;
            } else if (dist <= 2.5) {
                glow3 += sampleEdge * 0.1;
            }
        }
    }
    
    glow2 = min(glow2, 1.0);
    glow3 = min(glow3, 1.0);
    
    // Combine different glow layers with different colors
    vec3 neonEffect = vec3(0.0);
    neonEffect += cyanGlow * glow1 * 1.0;
    neonEffect += magentaGlow * glow2 * 0.8;
    neonEffect += yellowGlow * glow3 * 0.4;
    
    // Add pulsing effect
    float pulse = sin(u_time * 3.0) * 0.1 + 0.9;
    neonEffect *= pulse;
    
    // Combine with dark background
    vec3 finalColor = darkened + neonEffect;
    
    // Add bloom effect
    float bloom = (glow1 + glow2 * 0.5 + glow3 * 0.25) * 0.3;
    finalColor += bloom;
    
    // Enhance contrast
    finalColor = pow(finalColor, vec3(1.2));
    
    gl_FragColor = vec4(finalColor, originalColor.a);
}