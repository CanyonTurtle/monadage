from pathlib import Path
from PIL import Image, ImageFilter
import numpy as np
import random

from monadage.monad_image import MonadImage
from monadage.image_variants import PngImage
from monadage.imtools import Save, Quantize
from .base import Pipeline


class OilPaintingPipeline(Pipeline):
    """Creates oil painting effect with brush strokes and color blending"""
    
    def __init__(self, brush_size: int = 5, intensity: int = 3, **kwargs):
        super().__init__(**kwargs)
        self.brush_size = brush_size
        self.intensity = intensity
    
    def get_name(self) -> str:
        return "oil_painting"
    
    def get_description(self) -> str:
        return f"Creates oil painting effect with brush size {self.brush_size}"
    
    def _oil_paint_effect(self, img: Image.Image) -> Image.Image:
        """Apply oil painting effect using statistical analysis"""
        data = np.array(img)
        height, width, channels = data.shape
        result = np.zeros_like(data)
        
        for y in range(height):
            for x in range(width):
                # Define neighborhood
                y_min = max(0, y - self.brush_size)
                y_max = min(height, y + self.brush_size + 1)
                x_min = max(0, x - self.brush_size)
                x_max = min(width, x + self.brush_size + 1)
                
                # Get neighborhood pixels
                neighborhood = data[y_min:y_max, x_min:x_max]
                
                # Create intensity levels
                intensities = {}
                intensity_counts = {}
                
                for ny in range(neighborhood.shape[0]):
                    for nx in range(neighborhood.shape[1]):
                        pixel = neighborhood[ny, nx]
                        # Calculate intensity level - handle both RGB and grayscale
                        if len(pixel.shape) == 0:  # scalar
                            pixel_mean = float(pixel)
                        else:  # array
                            pixel_mean = float(np.mean(pixel))
                        intensity = int(pixel_mean / (256 // self.intensity)) * (256 // self.intensity)
                        
                        if intensity not in intensities:
                            intensities[intensity] = []
                            intensity_counts[intensity] = 0
                        
                        intensities[intensity].append(pixel)
                        intensity_counts[intensity] += 1
                
                # Find most common intensity
                if intensity_counts:
                    most_common_intensity = max(intensity_counts.keys(), key=lambda k: intensity_counts[k])
                    # Average all pixels at this intensity level
                    avg_pixel = np.mean(intensities[most_common_intensity], axis=0)
                    result[y, x] = avg_pixel.astype(np.uint8)
                else:
                    result[y, x] = data[y, x]
        
        return Image.fromarray(result)
    
    def _add_canvas_texture(self, img: Image.Image) -> Image.Image:
        """Add subtle canvas texture"""
        data = np.array(img)
        height, width = data.shape[:2]
        
        # Create noise pattern
        noise = np.random.randint(-10, 10, (height, width, 3))
        
        # Apply texture subtly
        textured = np.clip(data.astype(int) + noise * 0.3, 0, 255)
        
        return Image.fromarray(textured.astype(np.uint8))
    
    def process_image(self, input_path: Path, output_path: Path) -> None:
        original_img = Image.open(input_path).convert("RGB")
        
        # Apply slight blur first for smoother strokes
        blurred = original_img.filter(ImageFilter.GaussianBlur(radius=0.5))
        
        # Apply oil painting effect
        oil_painted = self._oil_paint_effect(blurred)
        
        # Add canvas texture
        textured = self._add_canvas_texture(oil_painted)
        
        # Slight enhancement
        result_monad = MonadImage(PngImage(textured))
        result_monad.bind(Quantize(n=16, method=1)).bind(Save(output_path))