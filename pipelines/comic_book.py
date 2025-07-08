from pathlib import Path
from PIL import Image, ImageFilter, ImageEnhance, ImageOps
import numpy as np

from monadage.monad_image import MonadImage
from monadage.image_variants import PngImage
from monadage.imtools import Save, Quantize
from .base import Pipeline


class ComicBookPipeline(Pipeline):
    """Creates comic book style art with bold outlines and flat colors"""
    
    def get_name(self) -> str:
        return "comic_book"
    
    def get_description(self) -> str:
        return "Creates comic book style art with bold outlines and flat colors"
    
    def _create_bold_outlines(self, img: Image.Image) -> Image.Image:
        """Create bold black outlines"""
        # Convert to grayscale for edge detection
        gray = img.convert('L')
        
        # Apply strong edge detection
        edges = gray.filter(ImageFilter.FIND_EDGES)
        
        # Enhance and threshold the edges
        enhancer = ImageEnhance.Contrast(edges)
        edges = enhancer.enhance(3.0)
        
        # Create binary edge mask
        edges_data = np.array(edges)
        edges_binary = (edges_data > 80).astype(np.uint8) * 255
        
        # Make edges thicker using simple dilation
        kernel_size = 3
        thick_edges = np.zeros_like(edges_binary)
        for y in range(kernel_size//2, edges_binary.shape[0] - kernel_size//2):
            for x in range(kernel_size//2, edges_binary.shape[1] - kernel_size//2):
                if np.any(edges_binary[y-1:y+2, x-1:x+2] > 0):
                    thick_edges[y, x] = 255
        
        return Image.fromarray(thick_edges)
    
    def _flatten_colors(self, img: Image.Image) -> Image.Image:
        """Flatten colors to create comic book effect"""
        data = np.array(img)
        
        # Aggressive quantization per channel
        for channel in range(3):
            # Reduce to 4 levels per channel
            data[:, :, channel] = (data[:, :, channel] // 64) * 64
        
        return Image.fromarray(data)
    
    def _apply_ben_day_dots(self, img: Image.Image) -> Image.Image:
        """Apply Ben Day dots pattern for comic book effect"""
        data = np.array(img)
        height, width = data.shape[:2]
        
        # Create dot pattern
        dot_size = 4
        dot_spacing = 6
        
        for y in range(0, height, dot_spacing):
            for x in range(0, width, dot_spacing):
                # Calculate dot intensity based on local brightness
                local_area = data[y:min(y+dot_spacing, height), x:min(x+dot_spacing, width)]
                avg_brightness = np.mean(local_area)
                
                # Draw dot based on brightness
                if avg_brightness < 200:  # Only add dots to darker areas
                    dot_radius = int((255 - avg_brightness) / 255 * dot_size)
                    
                    for dy in range(-dot_radius, dot_radius + 1):
                        for dx in range(-dot_radius, dot_radius + 1):
                            if dx*dx + dy*dy <= dot_radius*dot_radius:
                                ny, nx = y + dy, x + dx
                                if 0 <= ny < height and 0 <= nx < width:
                                    # Darken the pixel
                                    data[ny, nx] = data[ny, nx] * 0.7
        
        return Image.fromarray(data.astype(np.uint8))
    
    def _enhance_colors(self, img: Image.Image) -> Image.Image:
        """Enhance colors for comic book vibrancy"""
        # Increase saturation
        enhancer = ImageEnhance.Color(img)
        enhanced = enhancer.enhance(1.5)
        
        # Increase contrast
        enhancer = ImageEnhance.Contrast(enhanced)
        enhanced = enhancer.enhance(1.3)
        
        return enhanced
    
    def process_image(self, input_path: Path, output_path: Path) -> None:
        original_img = Image.open(input_path).convert("RGB")
        
        # Apply comic book effects
        flattened = self._flatten_colors(original_img)
        enhanced = self._enhance_colors(flattened)
        
        # Create outlines
        outlines = self._create_bold_outlines(original_img)
        
        # Apply Ben Day dots
        dotted = self._apply_ben_day_dots(enhanced)
        
        # Combine image with outlines
        img_data = np.array(dotted)
        outline_data = np.array(outlines)
        
        # Overlay black outlines
        mask = outline_data < 128
        for channel in range(3):
            img_data[:, :, channel] = np.where(mask, 0, img_data[:, :, channel])
        
        comic_img = Image.fromarray(img_data)
        
        # Final quantization for clean comic look
        result_monad = MonadImage(PngImage(comic_img))
        result_monad.bind(Quantize(n=12, method=1)).bind(Save(output_path))