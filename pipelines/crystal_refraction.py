from pathlib import Path
from PIL import Image, ImageFilter, ImageEnhance
import numpy as np
import random
import math

from monadage.monad_image import MonadImage
from monadage.image_variants import PngImage
from monadage.imtools import Save
from .base import Pipeline


class CrystalRefractionPipeline(Pipeline):
    """Creates crystal refraction effects with light prisms and spectral distortion"""
    
    def __init__(self, prism_intensity: float = 0.3, spectral_shift: int = 5, **kwargs):
        super().__init__(**kwargs)
        self.prism_intensity = prism_intensity
        self.spectral_shift = spectral_shift
    
    def get_name(self) -> str:
        return "crystal_refraction"
    
    def get_description(self) -> str:
        return "Creates crystal refraction effects with light prisms and spectral distortion"
    
    def _create_prism_effect(self, img: Image.Image) -> Image.Image:
        """Create prismatic light refraction patterns"""
        data = np.array(img)
        height, width = data.shape[:2]
        result = data.copy()
        
        # Create multiple refraction zones
        num_prisms = random.randint(8, 15)
        
        for _ in range(num_prisms):
            # Random prism center and size
            center_x = random.randint(width // 4, 3 * width // 4)
            center_y = random.randint(height // 4, 3 * height // 4)
            radius = random.randint(min(width, height) // 8, min(width, height) // 4)
            
            # Create circular mask for prism
            y, x = np.ogrid[:height, :width]
            mask = (x - center_x)**2 + (y - center_y)**2 <= radius**2
            
            if np.any(mask):
                # Apply spectral separation (RGB channel shift)
                for channel in range(3):
                    shift_x = random.randint(-self.spectral_shift, self.spectral_shift)
                    shift_y = random.randint(-self.spectral_shift, self.spectral_shift)
                    
                    # Create shifted coordinates
                    shifted_y = np.clip(y + shift_y, 0, height - 1)
                    shifted_x = np.clip(x + shift_x, 0, width - 1)
                    
                    # Apply shift only in masked area
                    result[mask, channel] = data[shifted_y, shifted_x][mask, channel]
        
        return Image.fromarray(result)
    
    def _add_crystalline_geometry(self, img: Image.Image) -> Image.Image:
        """Add geometric crystal-like patterns"""
        data = np.array(img)
        height, width = data.shape[:2]
        
        # Create triangular facet patterns
        overlay = np.zeros_like(data)
        
        # Generate random triangular facets
        num_facets = random.randint(20, 40)
        
        for _ in range(num_facets):
            # Create random triangle vertices
            x1, y1 = random.randint(0, width), random.randint(0, height)
            x2, y2 = random.randint(0, width), random.randint(0, height)
            x3, y3 = random.randint(0, width), random.randint(0, height)
            
            # Create triangle mask using cross product
            xx, yy = np.meshgrid(np.arange(width), np.arange(height))
            
            # Simple triangle fill using barycentric coordinates
            denom = ((y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3))
            if abs(denom) > 1e-6:  # Avoid division by zero
                a = ((y2 - y3) * (xx - x3) + (x3 - x2) * (yy - y3)) / denom
                b = ((y3 - y1) * (xx - x3) + (x1 - x3) * (yy - y3)) / denom
                c = 1 - a - b
                
                mask = (a >= 0) & (b >= 0) & (c >= 0)
                
                if np.any(mask):
                    # Apply brightness variation to create facet effect
                    brightness = random.uniform(0.7, 1.3)
                    overlay[mask] = (data[mask] * brightness).astype(np.uint8)
        
        # Blend original with faceted overlay
        alpha = self.prism_intensity
        result = (1 - alpha) * data + alpha * overlay
        
        return Image.fromarray(np.clip(result, 0, 255).astype(np.uint8))
    
    def _add_rainbow_highlights(self, img: Image.Image) -> Image.Image:
        """Add rainbow-like highlights simulating light dispersion"""
        data = np.array(img).astype(float)
        height, width = data.shape[:2]
        
        # Create rainbow streaks
        num_streaks = random.randint(5, 10)
        
        for _ in range(num_streaks):
            # Random streak parameters
            start_x = random.randint(0, width)
            start_y = random.randint(0, height)
            angle = random.uniform(0, 2 * math.pi)
            length = random.randint(width // 6, width // 3)
            thickness = random.randint(2, 8)
            
            # Create rainbow colors
            colors = [
                [255, 0, 0],    # Red
                [255, 127, 0],  # Orange
                [255, 255, 0],  # Yellow
                [0, 255, 0],    # Green
                [0, 0, 255],    # Blue
                [75, 0, 130],   # Indigo
                [148, 0, 211]   # Violet
            ]
            
            for i, color in enumerate(colors):
                # Offset each color slightly for dispersion effect
                offset = i * 2
                end_x = start_x + int((length + offset) * math.cos(angle))
                end_y = start_y + int((length + offset) * math.sin(angle))
                
                # Draw line with specified thickness
                x_coords = np.linspace(start_x, end_x, abs(end_x - start_x) + abs(end_y - start_y) + 1).astype(int)
                y_coords = np.linspace(start_y, end_y, abs(end_x - start_x) + abs(end_y - start_y) + 1).astype(int)
                
                for x, y in zip(x_coords, y_coords):
                    # Add thickness around the line
                    for dx in range(-thickness//2, thickness//2 + 1):
                        for dy in range(-thickness//2, thickness//2 + 1):
                            px, py = x + dx, y + dy
                            if 0 <= px < width and 0 <= py < height:
                                # Blend with existing pixel using low alpha
                                alpha = 0.1 * (1 - math.sqrt(dx*dx + dy*dy) / thickness)
                                if alpha > 0:
                                    data[py, px] = (1 - alpha) * data[py, px] + alpha * np.array(color)
        
        return Image.fromarray(np.clip(data, 0, 255).astype(np.uint8))
    
    def process_image(self, input_path: Path, output_path: Path) -> None:
        original_img = Image.open(input_path).convert("RGB")
        
        # Apply crystal effects in sequence
        prism_effect = self._create_prism_effect(original_img)
        crystalline = self._add_crystalline_geometry(prism_effect)
        rainbow_highlights = self._add_rainbow_highlights(crystalline)
        
        # Enhance saturation for more vivid crystal effect
        enhancer = ImageEnhance.Color(rainbow_highlights)
        enhanced = enhancer.enhance(1.3)
        
        # Slight sharpening for crisp crystal edges
        sharpened = enhanced.filter(ImageFilter.UnsharpMask(radius=1, percent=120, threshold=3))
        
        # Save result
        result_monad = MonadImage(PngImage(sharpened))
        result_monad.bind(Save(output_path))