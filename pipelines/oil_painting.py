from pathlib import Path
from PIL import Image, ImageFilter, ImageEnhance
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
        """Apply oil painting effect using optimized approach"""
        # Resize image for faster processing if too large
        original_size = img.size
        if max(original_size) > 800:
            # Scale down for processing
            scale_factor = 800 / max(original_size)
            new_size = (int(original_size[0] * scale_factor), int(original_size[1] * scale_factor))
            img = img.resize(new_size, Image.LANCZOS)
        
        # Apply stronger blur and quantization for oil painting effect
        blurred = img.filter(ImageFilter.GaussianBlur(radius=2))
        
        # Quantize colors heavily for oil painting look
        quantized = blurred.quantize(colors=32, method=Image.MEDIANCUT)
        result = quantized.convert("RGB")
        
        # Apply edge-preserving smoothing
        for _ in range(2):
            result = result.filter(ImageFilter.SMOOTH_MORE)
        
        # Resize back to original size if we scaled down
        if max(original_size) > 800:
            result = result.resize(original_size, Image.LANCZOS)
        
        return result
    
    def _add_canvas_texture(self, img: Image.Image) -> Image.Image:
        """Add subtle canvas texture using PIL filters for speed"""
        # Use PIL's built-in texture filter for speed
        textured = img.filter(ImageFilter.UnsharpMask(radius=0.5, percent=150, threshold=3))
        
        # Add very slight grain using PIL
        enhancer = ImageEnhance.Brightness(textured)
        result = enhancer.enhance(0.98)
        
        return result
    
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