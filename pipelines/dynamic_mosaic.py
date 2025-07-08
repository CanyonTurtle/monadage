from pathlib import Path
from PIL import Image, ImageOps
import numpy as np
from typing import Dict, List, Tuple

from monadage.monad_image import MonadImage
from monadage.image_variants import PngImage
from monadage.imtools import Save, Quantize, PillowsOp
from .base import Pipeline


class DynamicMosaicPipeline(Pipeline):
    """Pipeline that creates a fractal mosaic using perfect square regions with guaranteed full coverage"""
    
    def __init__(self, grid_size: int = 96, base_tile_size: int = 24, **kwargs):
        super().__init__(**kwargs)
        self.grid_size = grid_size
        self.base_tile_size = base_tile_size
    
    def get_name(self) -> str:
        return "dynamic_mosaic"
    
    def get_description(self) -> str:
        return f"Creates a fractal mosaic using perfect square regions with guaranteed full coverage ({self.grid_size}x{self.grid_size} grid)"
    
    def _find_square_regions(self, raster: np.ndarray) -> List[Dict]:
        """Find perfect square regions (1x1, 2x2, 3x3, 4x4) with same color"""
        height, width = raster.shape[:2]
        processed = np.zeros((height, width), dtype=bool)
        regions = []
        
        # Try to find largest squares first (4x4 down to 1x1)
        for size in [4, 3, 2, 1]:
            for y in range(height - size + 1):
                for x in range(width - size + 1):
                    # Skip if any pixel in this square is already processed
                    if np.any(processed[y:y+size, x:x+size]):
                        continue
                    
                    # Check if all pixels in the square have the same color
                    square_region = raster[y:y+size, x:x+size]
                    first_pixel = square_region[0, 0]
                    
                    if np.all(np.equal(square_region, first_pixel)):
                        # Found a valid square region
                        regions.append({
                            'top_left': (x, y),
                            'width': size,
                            'height': size,
                            'color': tuple(first_pixel)
                        })
                        
                        # Mark all pixels in this square as processed
                        processed[y:y+size, x:x+size] = True
        
        return regions
    
    def _create_color_variants(self, original_img: Image.Image, colors: List[Tuple[int, int, int]]) -> Dict[Tuple[int, int, int], Dict[int, Image.Image]]:
        """Create monochromatic variants of the original image at different sizes for crisp scaling"""
        variants = {}
        
        for color in colors:
            variants[color] = {}
            
            # Create variants at different sizes (1x, 2x, 3x, 4x base tile size)
            for scale in [1, 2, 3, 4]:
                target_size = self.base_tile_size * scale
                
                # Create a grayscale version at the target size (not upscaled)
                resized_img = original_img.resize((target_size, target_size), Image.LANCZOS)
                gray = ImageOps.grayscale(resized_img)
                
                # Convert grayscale to numpy array for processing
                gray_data = np.array(gray) / 255.0  # Normalize to 0-1
                
                # Remap grayscale range from [0,1] to [0.4,1] so black becomes prominent dark color
                gray_remapped = 0.4 + (gray_data * 0.6)  # Maps 0->0.4, 1->1.0
                
                # Create monochromatic version using the target color
                monochrome = np.zeros((target_size, target_size, 3), dtype=np.uint8)
                
                for i in range(3):  # RGB channels
                    # Apply remapped grayscale intensity to each color channel
                    monochrome[:, :, i] = (gray_remapped * color[i]).astype(np.uint8)
                
                # Convert to PIL image and quantize to 3 colors max
                monochrome_img = Image.fromarray(monochrome)
                quantized_tile = monochrome_img.quantize(colors=3, method=1)
                variants[color][scale] = quantized_tile.convert('RGB')
        
        return variants
    
    def _get_quantized_colors(self, quantized_img: Image.Image) -> List[Tuple[int, int, int]]:
        """Extract the unique colors from a quantized image"""
        rgb_img = quantized_img.convert('RGB')
        pixels = list(rgb_img.getdata())
        unique_colors = list(set(pixels))
        return unique_colors
    
    def process_image(self, input_path: Path, output_path: Path) -> None:
        """Create a dynamic mosaic using perfect square regions with guaranteed full coverage"""
        
        # Load and quantize the image
        original_img = Image.open(input_path).convert("RGB")
        monad_img = MonadImage(PngImage(original_img))
        
        # Quantize to reduce colors
        quantized_monad = monad_img.bind(Quantize(n=8, method=1))
        
        # Get the quantized PIL image
        if hasattr(quantized_monad.image, 'png'):
            quantized_img = quantized_monad.image.png.convert('RGB')
        else:
            raise ValueError("Expected PngImage after quantization")
        
        # Create low-resolution raster
        raster = quantized_img.resize((self.grid_size, self.grid_size), Image.NEAREST)
        raster_array = np.array(raster)
        
        # Find perfect square regions
        regions = self._find_square_regions(raster_array)
        
        # Get unique colors
        unique_colors = self._get_quantized_colors(quantized_img)
        
        # Create tinted variants at base size
        color_variants = self._create_color_variants(original_img, unique_colors)
        
        # Calculate output dimensions
        mosaic_width = self.grid_size * self.base_tile_size
        mosaic_height = self.grid_size * self.base_tile_size
        mosaic = Image.new('RGB', (mosaic_width, mosaic_height), (255, 255, 255))
        
        # Place tiles for each square region
        for region in regions:
            top_left_x, top_left_y = region['top_left']
            width = region['width']
            height = region['height']
            color = region['color']
            
            # Find the closest color variant
            closest_color = min(unique_colors, 
                              key=lambda c: sum((c[i] - color[i])**2 for i in range(3)))
            
            # Get the pre-scaled tile (crisp, not upscaled)
            tile = color_variants[closest_color][width]  # Use the scale that matches region width
            
            # Calculate position in mosaic (top-left corner placement)
            paste_x = top_left_x * self.base_tile_size
            paste_y = top_left_y * self.base_tile_size
            
            # Paste the tile
            mosaic.paste(tile, (paste_x, paste_y))
        
        # Save the result
        result_monad = MonadImage(PngImage(mosaic))
        result_monad.bind(Save(output_path))