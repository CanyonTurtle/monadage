precision mediump float;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_reflection_strength;
uniform float u_distortion;
uniform float u_highlight_intensity;
uniform float u_surface_roughness;
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

// Normal map generation from height
vec3 calculateNormal(vec2 uv, float heightScale) {
    float texelSize = 1.0 / max(u_resolution.x, u_resolution.y);
    
    float heightL = dot(texture2D(u_texture, uv - vec2(texelSize, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
    float heightR = dot(texture2D(u_texture, uv + vec2(texelSize, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
    float heightD = dot(texture2D(u_texture, uv - vec2(0.0, texelSize)).rgb, vec3(0.299, 0.587, 0.114));
    float heightU = dot(texture2D(u_texture, uv + vec2(0.0, texelSize)).rgb, vec3(0.299, 0.587, 0.114));
    
    vec3 normal;
    normal.x = (heightL - heightR) * heightScale;
    normal.y = (heightD - heightU) * heightScale;
    normal.z = 1.0;
    
    return normalize(normal);
}

// Fresnel effect calculation
float fresnel(vec3 viewDir, vec3 normal, float power) {
    return pow(1.0 - max(dot(viewDir, normal), 0.0), power);
}

// Environment reflection simulation
vec3 getEnvironmentColor(vec2 reflectionUV) {
    // Simulate a complex environment with gradients and patterns
    vec3 skyColor = mix(
        vec3(0.5, 0.7, 1.0), // Light blue
        vec3(0.2, 0.3, 0.6), // Darker blue
        reflectionUV.y
    );
    
    // Add some geometric patterns for interesting reflections
    float pattern = sin(reflectionUV.x * 20.0) * sin(reflectionUV.y * 15.0);
    skyColor += vec3(0.1, 0.1, 0.1) * pattern;
    
    // Add time-based movement
    float movement = sin(u_time * 0.5 + reflectionUV.x * 5.0) * 0.1;
    skyColor += vec3(movement, movement * 0.5, movement * 0.3);
    
    return skyColor;
}

void main() {
    vec2 uv = v_texCoord;
    
    // Original color
    vec3 originalColor = texture2D(u_texture, uv).rgb;
    
    // Calculate surface normal from luminance
    vec3 surfaceNormal = calculateNormal(uv, u_distortion * 0.1);
    
    // Add surface roughness
    vec2 roughnessOffset = vec2(
        noise(uv * 100.0) - 0.5,
        noise(uv * 100.0 + 50.0) - 0.5
    ) * u_surface_roughness * 0.01;
    
    surfaceNormal.xy += roughnessOffset;
    surfaceNormal = normalize(surfaceNormal);
    
    // View direction (assuming viewer is looking straight at surface)
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    
    // Calculate reflection vector
    vec3 reflectionDir = reflect(-viewDir, surfaceNormal);
    
    // Convert reflection direction to UV coordinates for environment lookup
    vec2 reflectionUV = reflectionDir.xy * 0.5 + 0.5;
    
    // Distort reflection based on surface
    reflectionUV += surfaceNormal.xy * u_distortion * 0.05;
    
    // Get environment reflection color
    vec3 reflectionColor = getEnvironmentColor(reflectionUV);
    
    // Calculate fresnel for realistic reflection strength
    float fresnelTerm = fresnel(viewDir, surfaceNormal, 2.0);
    
    // Convert original color to grayscale for chrome base
    float luminance = dot(originalColor, vec3(0.299, 0.587, 0.114));
    
    // Chrome base color with slight blue tint
    vec3 chromeBase = mix(
        vec3(0.4, 0.4, 0.45), // Dark chrome
        vec3(0.85, 0.85, 0.9), // Light chrome
        luminance
    );
    
    // Mix chrome base with reflection
    vec3 color = mix(chromeBase, reflectionColor, fresnelTerm * u_reflection_strength);
    
    // Add specular highlights
    vec3 lightDir = normalize(vec3(1.0, 1.0, 2.0));
    vec3 halfVector = normalize(lightDir + viewDir);
    float specular = pow(max(dot(surfaceNormal, halfVector), 0.0), 64.0);
    
    // Add highlights with chromatic dispersion
    vec3 highlight = vec3(
        specular * 1.2,
        specular * 1.0,
        specular * 0.8
    ) * u_highlight_intensity;
    
    color += highlight;
    
    // Add secondary light source for more complex lighting
    vec3 lightDir2 = normalize(vec3(-0.5, 0.5, 1.5));
    vec3 halfVector2 = normalize(lightDir2 + viewDir);
    float specular2 = pow(max(dot(surfaceNormal, halfVector2), 0.0), 32.0);
    color += vec3(0.3, 0.4, 0.5) * specular2 * u_highlight_intensity * 0.5;
    
    // Edge enhancement for chrome effect
    float edge = 1.0 - smoothstep(0.0, 0.2, abs(surfaceNormal.z));
    color += vec3(0.2, 0.25, 0.3) * edge * u_reflection_strength;
    
    // Subtle color variations based on position
    vec3 positionTint = vec3(
        sin(uv.x * 3.14159) * 0.1,
        cos(uv.y * 3.14159) * 0.1,
        sin((uv.x + uv.y) * 3.14159) * 0.05
    );
    color += positionTint * u_reflection_strength * 0.5;
    
    // Ensure chrome stays within realistic bounds
    color = clamp(color, 0.0, 1.0);
    
    gl_FragColor = vec4(color, 1.0);
}