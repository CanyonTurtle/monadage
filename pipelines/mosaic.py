from pathlib import Path
from PIL import Image, ImageOps
import numpy as np
from typing import Dict, List, Tuple

from monadage.monad_image import MonadImage
from monadage.image_variants import PngImage
from monadage.imtools import Save, Quantize, PillowsOp
from .base import Pipeline


class MosaicPipeline(Pipeline):
    """Pipeline that creates a mosaic of an image using tiny copies of itself"""
    
    def __init__(self, grid_size: int = 96, tile_size: int = 24, **kwargs):
        super().__init__(**kwargs)
        self.grid_size = grid_size  # Size of the raster grid (e.g., 96x96)
        self.tile_size = tile_size  # Size of each tile in pixels
    
    def get_name(self) -> str:
        return "mosaic"
    
    def get_description(self) -> str:
        return f"Creates a high-resolution mosaic using tiny copies of the image itself ({self.grid_size}x{self.grid_size} grid)"
    
    def _get_dominant_color(self, image: Image.Image) -> Tuple[int, int, int]:
        """Get the dominant color from an image"""
        # Convert to RGB and get pixel data
        rgb_img = image.convert('RGB')
        pixels = list(rgb_img.getdata())
        
        # Count color occurrences
        color_count = {}
        for pixel in pixels:
            if pixel in color_count:
                color_count[pixel] += 1
            else:
                color_count[pixel] = 1
        
        # Return most frequent color
        return max(color_count, key=color_count.get)
    
    def _create_color_variants(self, original_img: Image.Image, colors: List[Tuple[int, int, int]]) -> Dict[Tuple[int, int, int], Image.Image]:
        """Create color-tinted variants of the original image for each quantized color"""
        variants = {}
        
        # Create a small version of the original for tiling
        small_img = original_img.resize((self.tile_size, self.tile_size), Image.LANCZOS)
        
        for color in colors:
            # Create a tinted version
            gray = ImageOps.grayscale(small_img)
            rgb = gray.convert("RGB")
            
            # Apply color tint
            data = np.array(rgb)
            normalized = data[:, :, 0] / 255.0
            
            tinted = np.zeros_like(data)
            tinted[:, :, 0] = normalized * color[0]
            tinted[:, :, 1] = normalized * color[1] 
            tinted[:, :, 2] = normalized * color[2]
            
            variants[color] = Image.fromarray(tinted.astype(np.uint8))
        
        return variants
    
    def _get_quantized_colors(self, quantized_img: Image.Image) -> List[Tuple[int, int, int]]:
        """Extract the unique colors from a quantized image"""
        rgb_img = quantized_img.convert('RGB')
        pixels = list(rgb_img.getdata())
        unique_colors = list(set(pixels))
        return unique_colors
    
    def process_image(self, input_path: Path, output_path: Path) -> None:
        """Create a mosaic using tiny copies of the image itself"""
        
        # Load and quantize the image
        original_img = Image.open(input_path).convert("RGB")
        monad_img = MonadImage(PngImage(original_img))
        
        # Quantize to reduce colors (more colors for better detail)
        quantized_monad = monad_img.bind(Quantize(n=12, method=1))
        
        # Get the quantized PIL image
        if hasattr(quantized_monad.image, 'png'):
            quantized_img = quantized_monad.image.png.convert('RGB')
        else:
            raise ValueError("Expected PngImage after quantization")
        
        # Create low-resolution raster (the "legend")
        raster = quantized_img.resize((self.grid_size, self.grid_size), Image.NEAREST)
        
        # Get unique colors from quantized image
        unique_colors = self._get_quantized_colors(quantized_img)
        
        # Create tinted variants of the original image for each color
        color_variants = self._create_color_variants(original_img, unique_colors)
        
        # Create the final mosaic
        mosaic_width = self.grid_size * self.tile_size
        mosaic_height = self.grid_size * self.tile_size
        mosaic = Image.new('RGB', (mosaic_width, mosaic_height), (255, 255, 255))
        
        # Place tiles according to the raster
        for y in range(self.grid_size):
            for x in range(self.grid_size):
                # Get the color at this position in the raster
                raster_color = raster.getpixel((x, y))
                
                # Find the closest color variant
                closest_color = min(unique_colors, 
                                  key=lambda c: sum((c[i] - raster_color[i])**2 for i in range(3)))
                
                # Get the corresponding variant
                tile = color_variants[closest_color]
                
                # Calculate position in mosaic
                paste_x = x * self.tile_size
                paste_y = y * self.tile_size
                
                # Paste the tile
                mosaic.paste(tile, (paste_x, paste_y))
        
        # Save the result
        result_monad = MonadImage(PngImage(mosaic))
        result_monad.bind(Save(output_path))