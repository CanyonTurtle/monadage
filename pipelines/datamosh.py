from pathlib import Path
from PIL import Image
import numpy as np
import random

from monadage.monad_image import MonadImage
from monadage.image_variants import PngImage
from monadage.imtools import Save, Quantize
from .base import Pipeline


class DatamoshPipeline(Pipeline):
    """Creates datamoshing effects simulating digital compression artifacts"""
    
    def __init__(self, intensity: float = 0.3, **kwargs):
        super().__init__(**kwargs)
        self.intensity = intensity
    
    def get_name(self) -> str:
        return "datamosh"
    
    def get_description(self) -> str:
        return f"Creates datamoshing compression artifacts with {self.intensity} intensity"
    
    def _create_motion_vectors(self, img: Image.Image) -> np.ndarray:
        """Create random motion vectors for datamoshing"""
        height, width = img.size[1], img.size[0]
        
        # Create motion vector field - ensure we have at least 1x1 grid
        grid_height = max(1, height // 8)
        grid_width = max(1, width // 8)
        
        motion_x = np.random.randint(-10, 11, (grid_height, grid_width))
        motion_y = np.random.randint(-10, 11, (grid_height, grid_width))
        
        # Upscale motion vectors using proper dimensions
        motion_x = np.repeat(np.repeat(motion_x, 8, axis=0), 8, axis=1)
        motion_y = np.repeat(np.repeat(motion_y, 8, axis=0), 8, axis=1)
        
        # Resize to exact image size using proper array slicing
        motion_x = motion_x[:height, :width]
        motion_y = motion_y[:height, :width]
        
        # If the upscaled arrays are smaller than the image, pad them
        if motion_x.shape[0] < height or motion_x.shape[1] < width:
            motion_x_padded = np.zeros((height, width), dtype=motion_x.dtype)
            motion_y_padded = np.zeros((height, width), dtype=motion_y.dtype)
            
            motion_x_padded[:motion_x.shape[0], :motion_x.shape[1]] = motion_x
            motion_y_padded[:motion_y.shape[0], :motion_y.shape[1]] = motion_y
            
            motion_x = motion_x_padded
            motion_y = motion_y_padded
        
        return motion_x, motion_y
    
    def _apply_motion_vectors(self, img: Image.Image, motion_x: np.ndarray, motion_y: np.ndarray) -> Image.Image:
        """Apply motion vectors to create displacement"""
        data = np.array(img)
        height, width = data.shape[:2]
        result = data.copy()
        
        for y in range(height):
            for x in range(width):
                if random.random() < self.intensity:
                    # Apply motion vector
                    new_x = x + motion_x[y, x]
                    new_y = y + motion_y[y, x]
                    
                    # Clamp to image bounds
                    new_x = max(0, min(width - 1, new_x))
                    new_y = max(0, min(height - 1, new_y))
                    
                    result[y, x] = data[new_y, new_x]
        
        return Image.fromarray(result)
    
    def _add_compression_blocks(self, img: Image.Image) -> Image.Image:
        """Add JPEG-like compression blocks"""
        data = np.array(img)
        height, width = data.shape[:2]
        
        # Process in 8x8 blocks, handle edge cases properly
        for y in range(0, height, 8):
            for x in range(0, width, 8):
                # Calculate actual block size (may be smaller at edges)
                block_height = min(8, height - y)
                block_width = min(8, width - x)
                
                if random.random() < 0.1:  # 10% of blocks get corrupted
                    # Get block
                    block = data[y:y+block_height, x:x+block_width]
                    
                    # Corrupt block by reducing to single color or shifting
                    if random.random() < 0.5:
                        # Reduce to average color
                        avg_color = np.mean(block, axis=(0, 1))
                        data[y:y+block_height, x:x+block_width] = avg_color
                    else:
                        # Shift block content
                        shift_x = random.randint(-2, 2)
                        shift_y = random.randint(-2, 2)
                        shifted_block = np.roll(np.roll(block, shift_x, axis=1), shift_y, axis=0)
                        data[y:y+block_height, x:x+block_width] = shifted_block
        
        return Image.fromarray(data)
    
    def _add_color_bleeding(self, img: Image.Image) -> Image.Image:
        """Add color channel bleeding effects"""
        data = np.array(img)
        
        # Random color channel shifts
        for channel in range(3):
            if random.random() < 0.3:
                shift_x = random.randint(-3, 3)
                shift_y = random.randint(-3, 3)
                data[:, :, channel] = np.roll(np.roll(data[:, :, channel], shift_x, axis=1), shift_y, axis=0)
        
        return Image.fromarray(data)
    
    def process_image(self, input_path: Path, output_path: Path) -> None:
        original_img = Image.open(input_path).convert("RGB")
        
        # Create motion vectors
        motion_x, motion_y = self._create_motion_vectors(original_img)
        
        # Apply datamoshing effects
        datamoshed = self._apply_motion_vectors(original_img, motion_x, motion_y)
        datamoshed = self._add_compression_blocks(datamoshed)
        datamoshed = self._add_color_bleeding(datamoshed)
        
        # Quantize for more digital artifacts
        result_monad = MonadImage(PngImage(datamoshed))
        result_monad.bind(Quantize(n=32, method=1)).bind(Save(output_path))