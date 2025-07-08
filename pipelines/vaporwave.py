from pathlib import Path
from PIL import Image, ImageOps, ImageEnhance
import numpy as np

from monadage.monad_image import MonadImage
from monadage.image_variants import PngImage
from monadage.imtools import Save, Quantize, PillowsOp
from .base import Pipeline


class VaporwavePipeline(Pipeline):
    """Creates retro vaporwave aesthetic with pink/purple gradients and grid overlays"""
    
    def get_name(self) -> str:
        return "vaporwave"
    
    def get_description(self) -> str:
        return "Creates retro vaporwave aesthetic with neon colors and grid overlays"
    
    def _apply_vaporwave_colors(self, img: Image.Image) -> Image.Image:
        """Apply classic vaporwave color palette"""
        data = np.array(img.convert('RGB'))
        
        # Convert to HSV for color manipulation
        from colorsys import rgb_to_hsv, hsv_to_rgb
        
        height, width = data.shape[:2]
        result = np.zeros_like(data)
        
        for y in range(height):
            for x in range(width):
                r, g, b = data[y, x] / 255.0
                h, s, v = rgb_to_hsv(r, g, b)
                
                # Shift hue towards pink/purple
                h = (h + 0.8) % 1.0
                # Increase saturation
                s = min(1.0, s * 1.5)
                # Enhance contrast
                v = v ** 0.8
                
                r, g, b = hsv_to_rgb(h, s, v)
                result[y, x] = [int(r * 255), int(g * 255), int(b * 255)]
        
        return Image.fromarray(result)
    
    def _add_grid_overlay(self, img: Image.Image) -> Image.Image:
        """Add retro grid overlay"""
        data = np.array(img)
        height, width = data.shape[:2]
        
        # Add vertical grid lines
        for x in range(0, width, 20):
            if x < width:
                data[:, x] = np.minimum(data[:, x] + 50, 255)
        
        # Add horizontal grid lines
        for y in range(0, height, 20):
            if y < height:
                data[y, :] = np.minimum(data[y, :] + 50, 255)
        
        return Image.fromarray(data)
    
    def _add_neon_glow(self, img: Image.Image) -> Image.Image:
        """Add neon glow effect"""
        # Create a blurred version for glow
        blurred = img.filter(ImageFilter.GaussianBlur(radius=3))
        
        # Blend with original
        data_orig = np.array(img)
        data_blur = np.array(blurred)
        
        # Add glow by blending
        result = np.minimum(data_orig + data_blur * 0.3, 255)
        
        return Image.fromarray(result.astype(np.uint8))
    
    def process_image(self, input_path: Path, output_path: Path) -> None:
        from PIL import ImageFilter
        
        original_img = Image.open(input_path).convert("RGB")
        
        # Apply vaporwave effects
        vaporwave = self._apply_vaporwave_colors(original_img)
        vaporwave = self._add_grid_overlay(vaporwave)
        
        # Enhance contrast and saturation
        enhancer = ImageEnhance.Contrast(vaporwave)
        vaporwave = enhancer.enhance(1.3)
        
        enhancer = ImageEnhance.Color(vaporwave)
        vaporwave = enhancer.enhance(1.5)
        
        # Quantize for retro look
        result_monad = MonadImage(PngImage(vaporwave))
        result_monad.bind(Quantize(n=8, method=1)).bind(Save(output_path))