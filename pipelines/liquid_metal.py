from pathlib import Path
from PIL import Image, ImageFilter, ImageEnhance
import numpy as np
import random
import math

from monadage.monad_image import MonadImage
from monadage.image_variants import PngImage
from monadage.imtools import Save
from .base import Pipeline


class LiquidMetalPipeline(Pipeline):
    """Creates liquid metal effects with flowing metallic surfaces and reflections"""
    
    def __init__(self, flow_intensity: float = 0.6, metallic_sheen: float = 0.8, **kwargs):
        super().__init__(**kwargs)
        self.flow_intensity = flow_intensity
        self.metallic_sheen = metallic_sheen
    
    def get_name(self) -> str:
        return "liquid_metal"
    
    def get_description(self) -> str:
        return "Creates liquid metal effects with flowing metallic surfaces and reflections"
    
    def _create_flow_field(self, width: int, height: int) -> tuple:
        """Generate flow field for liquid movement"""
        # Create Perlin-like noise for flow direction
        flow_x = np.zeros((height, width))
        flow_y = np.zeros((height, width))
        
        # Generate multiple octaves of flow
        for octave in range(3):
            scale = 2 ** octave
            amplitude = 1.0 / scale
            
            for y in range(height):
                for x in range(width):
                    # Simple noise-like flow field
                    flow_x[y, x] += amplitude * math.sin(x * 0.01 * scale + y * 0.005 * scale)
                    flow_y[y, x] += amplitude * math.cos(y * 0.01 * scale + x * 0.005 * scale)
        
        return flow_x, flow_y
    
    def _apply_liquid_distortion(self, img: Image.Image) -> Image.Image:
        """Apply liquid-like distortion to the image"""
        data = np.array(img)
        height, width = data.shape[:2]
        
        # Create flow field
        flow_x, flow_y = self._create_flow_field(width, height)
        
        # Apply distortion based on flow field
        distorted = np.zeros_like(data)
        
        for y in range(height):
            for x in range(width):
                # Calculate source coordinates based on flow
                src_x = x + int(flow_x[y, x] * self.flow_intensity * 10)
                src_y = y + int(flow_y[y, x] * self.flow_intensity * 10)
                
                # Clamp coordinates
                src_x = np.clip(src_x, 0, width - 1)
                src_y = np.clip(src_y, 0, height - 1)
                
                distorted[y, x] = data[src_y, src_x]
        
        return Image.fromarray(distorted)
    
    def _create_metallic_surface(self, img: Image.Image) -> Image.Image:
        """Transform colors to metallic tones"""
        data = np.array(img).astype(float)
        
        # Convert to grayscale for luminance
        gray = np.dot(data[...,:3], [0.299, 0.587, 0.114])
        
        # Create metallic color palette based on luminance
        metallic_colors = np.zeros_like(data)
        
        # Silver/chrome base with color tinting
        for y in range(data.shape[0]):
            for x in range(data.shape[1]):
                luminance = gray[y, x] / 255.0
                
                # Base metallic color (silver/chrome)
                base_r = 192 + (luminance - 0.5) * 100
                base_g = 192 + (luminance - 0.5) * 100  
                base_b = 192 + (luminance - 0.5) * 100
                
                # Add color tinting based on original colors
                orig_color = data[y, x] / 255.0
                
                # Blend metallic base with original color
                metallic_colors[y, x, 0] = base_r * 0.7 + orig_color[0] * 128 * 0.3
                metallic_colors[y, x, 1] = base_g * 0.7 + orig_color[1] * 128 * 0.3
                metallic_colors[y, x, 2] = base_b * 0.7 + orig_color[2] * 128 * 0.3
        
        return Image.fromarray(np.clip(metallic_colors, 0, 255).astype(np.uint8))
    
    def _add_specular_highlights(self, img: Image.Image) -> Image.Image:
        """Add specular highlights to simulate metal reflections"""
        data = np.array(img).astype(float)
        height, width = data.shape[:2]
        
        # Create highlight patterns
        highlight_overlay = np.zeros_like(data)
        
        # Add flowing highlight streaks
        num_highlights = random.randint(15, 25)
        
        for _ in range(num_highlights):
            # Random highlight parameters
            start_x = random.randint(0, width)
            start_y = random.randint(0, height)
            angle = random.uniform(0, 2 * math.pi)
            length = random.randint(width // 8, width // 3)
            intensity = random.uniform(0.3, 0.8)
            
            # Create flowing highlight line
            end_x = start_x + int(length * math.cos(angle))
            end_y = start_y + int(length * math.sin(angle))
            
            # Draw smooth highlight streak
            steps = max(abs(end_x - start_x), abs(end_y - start_y))
            if steps > 0:
                for i in range(steps):
                    t = i / steps
                    x = int(start_x + t * (end_x - start_x))
                    y = int(start_y + t * (end_y - start_y))
                    
                    if 0 <= x < width and 0 <= y < height:
                        # Create gaussian falloff for smooth highlight
                        for dx in range(-5, 6):
                            for dy in range(-5, 6):
                                px, py = x + dx, y + dy
                                if 0 <= px < width and 0 <= py < height:
                                    distance = math.sqrt(dx*dx + dy*dy)
                                    falloff = math.exp(-distance * 0.5)
                                    highlight_value = intensity * falloff * 255
                                    
                                    highlight_overlay[py, px] = np.maximum(
                                        highlight_overlay[py, px], 
                                        [highlight_value, highlight_value, highlight_value]
                                    )
        
        # Add random reflective spots
        num_spots = random.randint(10, 20)
        for _ in range(num_spots):
            x = random.randint(10, width - 10)
            y = random.randint(10, height - 10)
            radius = random.randint(3, 15)
            intensity = random.uniform(0.4, 0.9)
            
            for dx in range(-radius, radius + 1):
                for dy in range(-radius, radius + 1):
                    px, py = x + dx, y + dy
                    if 0 <= px < width and 0 <= py < height:
                        distance = math.sqrt(dx*dx + dy*dy)
                        if distance <= radius:
                            falloff = 1 - (distance / radius)
                            highlight_value = intensity * falloff * 255
                            highlight_overlay[py, px] = np.maximum(
                                highlight_overlay[py, px],
                                [highlight_value, highlight_value, highlight_value]
                            )
        
        # Blend highlights with image
        result = data + highlight_overlay * self.metallic_sheen
        
        return Image.fromarray(np.clip(result, 0, 255).astype(np.uint8))
    
    def _add_surface_ripples(self, img: Image.Image) -> Image.Image:
        """Add surface ripples to enhance liquid metal effect"""
        # Apply slight wave distortion for ripple effect
        data = np.array(img)
        height, width = data.shape[:2]
        rippled = np.zeros_like(data)
        
        # Create multiple ripple centers
        ripple_centers = [(random.randint(0, width), random.randint(0, height)) for _ in range(3)]
        
        for y in range(height):
            for x in range(width):
                total_offset_x = 0
                total_offset_y = 0
                
                for center_x, center_y in ripple_centers:
                    distance = math.sqrt((x - center_x)**2 + (y - center_y)**2)
                    ripple_strength = 3 * math.sin(distance * 0.1) * math.exp(-distance * 0.01)
                    
                    # Calculate ripple direction (perpendicular to radius)
                    if distance > 0:
                        norm_x = (x - center_x) / distance
                        norm_y = (y - center_y) / distance
                        
                        total_offset_x += ripple_strength * norm_y  # Perpendicular
                        total_offset_y += ripple_strength * (-norm_x)  # Perpendicular
                
                # Sample from offset position
                src_x = np.clip(x + int(total_offset_x), 0, width - 1)
                src_y = np.clip(y + int(total_offset_y), 0, height - 1)
                
                rippled[y, x] = data[src_y, src_x]
        
        return Image.fromarray(rippled)
    
    def process_image(self, input_path: Path, output_path: Path) -> None:
        original_img = Image.open(input_path).convert("RGB")
        
        # Apply liquid metal transformation sequence
        liquid_distorted = self._apply_liquid_distortion(original_img)
        metallic_surface = self._create_metallic_surface(liquid_distorted)
        surface_ripples = self._add_surface_ripples(metallic_surface)
        specular_highlights = self._add_specular_highlights(surface_ripples)
        
        # Enhance contrast for more metallic appearance
        enhancer = ImageEnhance.Contrast(specular_highlights)
        enhanced = enhancer.enhance(1.2)
        
        # Slight blur for smooth metallic surface
        smooth = enhanced.filter(ImageFilter.GaussianBlur(radius=0.5))
        
        # Save result
        result_monad = MonadImage(PngImage(smooth))
        result_monad.bind(Save(output_path))