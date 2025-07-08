from pathlib import Path
from PIL import Image, ImageOps
import numpy as np

from monadage.monad_image import MonadImage
from monadage.image_variants import PngImage
from monadage.imtools import Save, Quantize, PillowsOp
from .base import Pipeline


class FourCornersPipeline(Pipeline):
    """Pipeline that creates RGBY monochrome copies in each corner of a quantized image"""
    
    def get_name(self) -> str:
        return "four_corners"
    
    def get_description(self) -> str:
        return "Creates red, green, blue, and yellow monochrome copies of quantized image in each corner"
    
    def _tint_monochrome(self, image: Image.Image, color: tuple) -> Image.Image:
        """Apply color tint to a monochrome image"""
        # Convert to grayscale first
        gray = ImageOps.grayscale(image)
        
        # Convert back to RGB
        rgb = gray.convert("RGB")
        
        # Apply color tint
        data = np.array(rgb)
        
        # Normalize the grayscale values (0-255) to (0-1)
        normalized = data[:, :, 0] / 255.0
        
        # Apply the color tint
        tinted = np.zeros_like(data)
        tinted[:, :, 0] = normalized * color[0]  # Red channel
        tinted[:, :, 1] = normalized * color[1]  # Green channel
        tinted[:, :, 2] = normalized * color[2]  # Blue channel
        
        return Image.fromarray(tinted.astype(np.uint8))
    
    def process_image(self, input_path: Path, output_path: Path) -> None:
        """Process image with four colored corners"""
        
        # Load and quantize the image
        original_img = Image.open(input_path).convert("RGB")
        monad_img = MonadImage(PngImage(original_img))
        
        # Quantize the image
        quantized_img = monad_img.bind(Quantize(n=4, method=1))
        
        # Get the quantized PIL image
        if hasattr(quantized_img.image, 'png'):
            base_img = quantized_img.image.png
        else:
            raise ValueError("Expected PngImage after quantization")
        
        # Define colors for each corner: Red, Green, Blue, Yellow
        colors = {
            'red': (255, 0, 0),
            'green': (0, 255, 0),
            'blue': (0, 0, 255),
            'yellow': (255, 255, 0)
        }
        
        # Create the final composition
        width, height = base_img.size
        
        # Create a larger canvas (2x2 grid)
        canvas_width = width * 2
        canvas_height = height * 2
        canvas = Image.new('RGB', (canvas_width, canvas_height), (255, 255, 255))
        
        # Create tinted versions for each corner
        corner_positions = [
            (0, 0),           # Top-left: Red
            (width, 0),       # Top-right: Green
            (0, height),      # Bottom-left: Blue
            (width, height)   # Bottom-right: Yellow
        ]
        
        corner_colors = ['red', 'green', 'blue', 'yellow']
        
        for i, (pos, color_name) in enumerate(zip(corner_positions, corner_colors)):
            # Create tinted version
            tinted = self._tint_monochrome(base_img, colors[color_name])
            
            # Paste onto canvas
            canvas.paste(tinted, pos)
        
        # Save the result
        result_monad = MonadImage(PngImage(canvas))
        result_monad.bind(Save(output_path))