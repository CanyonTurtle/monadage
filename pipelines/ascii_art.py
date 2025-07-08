from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import numpy as np

from monadage.monad_image import MonadImage
from monadage.image_variants import PngImage
from monadage.imtools import Save
from .base import Pipeline


class AsciiArtPipeline(Pipeline):
    """Converts images to ASCII art using text characters"""
    
    def __init__(self, char_width: int = 8, **kwargs):
        super().__init__(**kwargs)
        self.char_width = char_width
        self.ascii_chars = " .:-=+*#%@"
    
    def get_name(self) -> str:
        return "ascii_art"
    
    def get_description(self) -> str:
        return f"Converts images to ASCII art using text characters (char width: {self.char_width})"
    
    def _image_to_ascii(self, img: Image.Image) -> str:
        """Convert image to ASCII string"""
        # Resize to lower resolution
        width = 80
        height = int(img.height * width / img.width * 0.5)  # Adjust for character aspect ratio
        img_resized = img.resize((width, height), Image.LANCZOS)
        
        # Convert to grayscale
        gray = img_resized.convert('L')
        pixels = np.array(gray)
        
        # Map pixels to ASCII characters
        ascii_str = ""
        for row in pixels:
            for pixel in row:
                char_index = int(pixel / 255 * (len(self.ascii_chars) - 1))
                ascii_str += self.ascii_chars[char_index]
            ascii_str += "\n"
        
        return ascii_str
    
    def _ascii_to_image(self, ascii_str: str, original_size: tuple) -> Image.Image:
        """Convert ASCII string back to image"""
        lines = ascii_str.strip().split('\n')
        
        # Calculate image size
        char_height = self.char_width
        img_width = len(lines[0]) * self.char_width
        img_height = len(lines) * char_height
        
        # Create image
        img = Image.new('RGB', (img_width, img_height), 'black')
        draw = ImageDraw.Draw(img)
        
        # Try to use a monospace font
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf", self.char_width)
        except:
            font = ImageFont.load_default()
        
        # Draw ASCII characters
        for y, line in enumerate(lines):
            for x, char in enumerate(line):
                # Color based on character brightness
                brightness = self.ascii_chars.index(char) / (len(self.ascii_chars) - 1)
                color_val = int(brightness * 255)
                color = (color_val, color_val, color_val)
                
                draw.text((x * self.char_width, y * char_height), char, fill=color, font=font)
        
        # Resize back to original proportions
        return img.resize(original_size, Image.LANCZOS)
    
    def process_image(self, input_path: Path, output_path: Path) -> None:
        original_img = Image.open(input_path).convert("RGB")
        
        # Convert to ASCII and back to image
        ascii_str = self._image_to_ascii(original_img)
        ascii_img = self._ascii_to_image(ascii_str, original_img.size)
        
        # Save result
        result_monad = MonadImage(PngImage(ascii_img))
        result_monad.bind(Save(output_path))