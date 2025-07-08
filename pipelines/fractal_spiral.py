from pathlib import Path
from PIL import Image
import numpy as np
import math

from monadage.monad_image import MonadImage
from monadage.image_variants import PngImage
from monadage.imtools import Save, Quantize
from .base import Pipeline


class FractalSpiralPipeline(Pipeline):
    """Creates fractal spiral effects with recursive warping"""
    
    def __init__(self, spiral_strength: float = 2.0, iterations: int = 3, **kwargs):
        super().__init__(**kwargs)
        self.spiral_strength = spiral_strength
        self.iterations = iterations
    
    def get_name(self) -> str:
        return "fractal_spiral"
    
    def get_description(self) -> str:
        return f"Creates fractal spiral effects with {self.iterations} iterations"
    
    def _spiral_transform(self, img: Image.Image, center_x: float, center_y: float, strength: float) -> Image.Image:
        """Apply spiral transformation around a center point"""
        data = np.array(img)
        height, width = data.shape[:2]
        result = np.zeros_like(data)
        
        for y in range(height):
            for x in range(width):
                # Calculate distance and angle from center
                dx = x - center_x
                dy = y - center_y
                distance = math.sqrt(dx*dx + dy*dy)
                
                if distance == 0:
                    result[y, x] = data[y, x]
                    continue
                
                # Calculate spiral transformation
                angle = math.atan2(dy, dx)
                
                # Add spiral rotation based on distance
                spiral_angle = angle + (strength * distance / max(width, height))
                
                # Apply logarithmic spiral scaling
                spiral_distance = distance * (1 + 0.1 * math.sin(spiral_angle * 3))
                
                # Calculate new coordinates
                new_x = center_x + spiral_distance * math.cos(spiral_angle)
                new_y = center_y + spiral_distance * math.sin(spiral_angle)
                
                # Sample from original image with bilinear interpolation
                if 0 <= new_x < width-1 and 0 <= new_y < height-1:
                    x1, y1 = int(new_x), int(new_y)
                    x2, y2 = x1 + 1, y1 + 1
                    
                    # Bilinear interpolation weights
                    wx = new_x - x1
                    wy = new_y - y1
                    
                    # Interpolate
                    pixel = (data[y1, x1] * (1-wx) * (1-wy) +
                            data[y1, x2] * wx * (1-wy) +
                            data[y2, x1] * (1-wx) * wy +
                            data[y2, x2] * wx * wy)
                    
                    result[y, x] = pixel.astype(np.uint8)
                else:
                    # Use nearest edge pixel
                    clamp_x = max(0, min(width-1, int(new_x)))
                    clamp_y = max(0, min(height-1, int(new_y)))
                    result[y, x] = data[clamp_y, clamp_x]
        
        return Image.fromarray(result)
    
    def _create_recursive_spirals(self, img: Image.Image) -> Image.Image:
        """Create multiple recursive spiral transformations"""
        current_img = img
        width, height = img.size
        
        # Define spiral centers (golden ratio positions)
        phi = (1 + math.sqrt(5)) / 2
        centers = [
            (width * 0.618, height * 0.382),  # Golden ratio point
            (width * 0.382, height * 0.618),  # Conjugate point
            (width * 0.5, height * 0.5),     # Center
        ]
        
        for iteration in range(self.iterations):
            # Apply spiral transforms at different centers
            for i, (cx, cy) in enumerate(centers):
                strength = self.spiral_strength * (0.8 ** iteration) * (1 + 0.3 * i)
                current_img = self._spiral_transform(current_img, cx, cy, strength)
        
        return current_img
    
    def _add_fractal_noise(self, img: Image.Image) -> Image.Image:
        """Add fractal-inspired noise patterns"""
        data = np.array(img)
        height, width = data.shape[:2]
        
        # Create fractal noise
        noise = np.zeros((height, width))
        
        for octave in range(4):
            frequency = 2 ** octave
            amplitude = 0.5 ** octave
            
            for y in range(height):
                for x in range(width):
                    noise[y, x] += amplitude * math.sin(x * frequency * 0.01) * math.cos(y * frequency * 0.01)
        
        # Normalize noise
        noise = (noise - noise.min()) / (noise.max() - noise.min())
        noise = (noise * 30 - 15).astype(int)  # Range -15 to 15
        
        # Apply noise to image
        for channel in range(3):
            data[:, :, channel] = np.clip(data[:, :, channel].astype(int) + noise, 0, 255)
        
        return Image.fromarray(data.astype(np.uint8))
    
    def process_image(self, input_path: Path, output_path: Path) -> None:
        original_img = Image.open(input_path).convert("RGB")
        
        # Apply recursive spiral transformations
        spiral_img = self._create_recursive_spirals(original_img)
        
        # Add fractal noise
        fractal_img = self._add_fractal_noise(spiral_img)
        
        # Enhance with quantization
        result_monad = MonadImage(PngImage(fractal_img))
        result_monad.bind(Quantize(n=16, method=1)).bind(Save(output_path))