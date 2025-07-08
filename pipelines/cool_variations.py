from pathlib import Path
from PIL import Image
import random

from monadage.monad_image import MonadImage
from monadage.image_variants import PngImage
from monadage.imtools import (
    Save, Quantize, RemoveBackground, ApplyGrunge, 
    ReplaceColorWithColorRGBA, PillowsOp
)
from monadage.pillow_helpers import add_corners, add_text
from .base import Pipeline


class CoolVariationsPipeline(Pipeline):
    """Pipeline that applies random cool variations to images"""
    
    def get_name(self) -> str:
        return "cool_variations"
    
    def get_description(self) -> str:
        return "Applies random cool variations like quantization, color replacement, and corner rounding"
    
    def process_image(self, input_path: Path, output_path: Path) -> None:
        """Apply a random cool variation to an image"""
        
        # Load the image
        original_img = Image.open(input_path).convert("RGBA")
        monad_img = MonadImage(PngImage(original_img))
        
        # Choose a random variation style
        variations = [
            # Grunge + quantize
            lambda img: img.bind(Quantize(n=4, method=1)).bind(PillowsOp(lambda x: add_corners(x, 20))),
            
            # Color replacement + corners
            lambda img: img.bind(ReplaceColorWithColorRGBA((255, 255, 255, 255), (255, 200, 150, 255))).bind(PillowsOp(lambda x: add_corners(x, 15))),
            
            # Quantize + remove background
            lambda img: img.bind(Quantize(n=3, method=1)).bind(RemoveBackground()),
            
            # Add text overlay
            lambda img: img.bind(PillowsOp(lambda x: add_text(x, "COOL", font_size=min(x.size)//8, pos=(10, 10), color=(255, 100, 100, 200)))),
            
            # Heavy quantization
            lambda img: img.bind(Quantize(n=2, method=1)).bind(PillowsOp(lambda x: add_corners(x, 25))),
            
            # Color shift + corners
            lambda img: img.bind(ReplaceColorWithColorRGBA((0, 0, 0, 255), (50, 150, 255, 255))).bind(PillowsOp(lambda x: add_corners(x, 10))),
        ]
        
        # Apply random variation
        variation = random.choice(variations)
        processed_img = variation(monad_img)
        
        # Save the result
        processed_img.bind(Save(output_path))