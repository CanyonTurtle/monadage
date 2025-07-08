from pathlib import Path
from PIL import Image
import numpy as np
import math

from monadage.monad_image import MonadImage
from monadage.image_variants import PngImage
from monadage.imtools import Save, Quantize
from .base import Pipeline


class KaleidoscopePipeline(Pipeline):
    """Creates kaleidoscope effects by mirroring triangular segments"""
    
    def __init__(self, segments: int = 8, **kwargs):
        super().__init__(**kwargs)
        self.segments = segments
    
    def get_name(self) -> str:
        return "kaleidoscope"
    
    def get_description(self) -> str:
        return f"Creates kaleidoscope effects with {self.segments} mirrored segments"
    
    def _create_kaleidoscope(self, img: Image.Image) -> Image.Image:
        """Create kaleidoscope effect"""
        # Make image square
        size = min(img.size)
        img = img.resize((size, size), Image.LANCZOS)
        
        data = np.array(img)
        height, width = data.shape[:2]
        center_x, center_y = width // 2, height // 2
        
        result = np.zeros_like(data)
        
        # Angle per segment
        angle_per_segment = 2 * math.pi / self.segments
        
        for y in range(height):
            for x in range(width):
                # Convert to polar coordinates
                dx = x - center_x
                dy = y - center_y
                radius = math.sqrt(dx*dx + dy*dy)
                
                if radius == 0:
                    result[y, x] = data[center_y, center_x]
                    continue
                
                angle = math.atan2(dy, dx)
                if angle < 0:
                    angle += 2 * math.pi
                
                # Find which segment this angle belongs to
                segment = int(angle / angle_per_segment)
                
                # Mirror angle within the first segment
                segment_angle = angle % angle_per_segment
                if segment % 2 == 1:  # Mirror every other segment
                    segment_angle = angle_per_segment - segment_angle
                
                # Convert back to cartesian for the first segment
                new_x = center_x + radius * math.cos(segment_angle)
                new_y = center_y + radius * math.sin(segment_angle)
                
                # Clamp to image bounds
                new_x = max(0, min(width - 1, int(new_x)))
                new_y = max(0, min(height - 1, int(new_y)))
                
                result[y, x] = data[new_y, new_x]
        
        return Image.fromarray(result)
    
    def process_image(self, input_path: Path, output_path: Path) -> None:
        original_img = Image.open(input_path).convert("RGB")
        
        # Create kaleidoscope effect
        kaleidoscope = self._create_kaleidoscope(original_img)
        
        # Enhance with quantization
        result_monad = MonadImage(PngImage(kaleidoscope))
        result_monad.bind(Quantize(n=12, method=1)).bind(Save(output_path))