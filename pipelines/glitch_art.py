from pathlib import Path
from PIL import Image, ImageOps
import numpy as np
import random

from monadage.monad_image import MonadImage
from monadage.image_variants import PngImage
from monadage.imtools import Save, Quantize, PillowsOp
from .base import Pipeline


class GlitchArtPipeline(Pipeline):
    """Creates digital glitch art effects with pixel corruption and color channel shifts"""
    
    def get_name(self) -> str:
        return "glitch_art"
    
    def get_description(self) -> str:
        return "Creates digital glitch art with pixel corruption, channel shifts, and scan lines"
    
    def _corrupt_pixels(self, img: Image.Image, corruption_rate: float = 0.05) -> Image.Image:
        """Randomly corrupt pixels to create glitch effect"""
        data = np.array(img)
        height, width, channels = data.shape
        
        # Random pixel corruption
        num_corrupted = int(height * width * corruption_rate)
        for _ in range(num_corrupted):
            y = random.randint(0, height - 1)
            x = random.randint(0, width - 1)
            data[y, x] = [random.randint(0, 255) for _ in range(channels)]
        
        return Image.fromarray(data)
    
    def _channel_shift(self, img: Image.Image) -> Image.Image:
        """Shift RGB channels to create chromatic aberration"""
        data = np.array(img)
        shifted = data.copy()
        
        # Shift red channel right
        shifted[:, 5:, 0] = data[:, :-5, 0]
        # Shift blue channel left  
        shifted[:, :-5, 2] = data[:, 5:, 2]
        
        return Image.fromarray(shifted)
    
    def _add_scan_lines(self, img: Image.Image) -> Image.Image:
        """Add horizontal scan lines"""
        data = np.array(img)
        height, width = data.shape[:2]
        
        # Add dark scan lines every 4 pixels
        for y in range(0, height, 4):
            if y < height:
                data[y, :] = data[y, :] * 0.3
        
        return Image.fromarray(data.astype(np.uint8))
    
    def process_image(self, input_path: Path, output_path: Path) -> None:
        original_img = Image.open(input_path).convert("RGB")
        monad_img = MonadImage(PngImage(original_img))
        
        # Apply glitch effects
        glitched = self._corrupt_pixels(original_img)
        glitched = self._channel_shift(glitched)
        glitched = self._add_scan_lines(glitched)
        
        # Quantize for posterized effect
        result_monad = MonadImage(PngImage(glitched))
        result_monad.bind(Quantize(n=6, method=1)).bind(Save(output_path))