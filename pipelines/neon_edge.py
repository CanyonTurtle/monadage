from pathlib import Path
from PIL import Image, ImageFilter, ImageOps, ImageEnhance
import numpy as np

from monadage.monad_image import MonadImage
from monadage.image_variants import PngImage
from monadage.imtools import Save, Quantize
from .base import Pipeline


class NeonEdgePipeline(Pipeline):
    """Creates neon edge lighting effects on dark backgrounds"""
    
    def get_name(self) -> str:
        return "neon_edge"
    
    def get_description(self) -> str:
        return "Creates neon edge lighting effects with glowing outlines on dark backgrounds"
    
    def _detect_edges(self, img: Image.Image) -> Image.Image:
        """Detect edges using Sobel-like filter"""
        # Convert to grayscale for edge detection
        gray = img.convert('L')
        
        # Apply edge detection
        edges = gray.filter(ImageFilter.FIND_EDGES)
        
        # Enhance edge detection
        edges = ImageEnhance.Contrast(edges).enhance(2.0)
        
        return edges
    
    def _create_neon_glow(self, edges: Image.Image, color: tuple = (0, 255, 255)) -> Image.Image:
        """Create neon glow effect from edges"""
        # Convert edges to RGB
        edges_rgb = edges.convert('RGB')
        data = np.array(edges_rgb)
        
        # Create neon color version
        neon = np.zeros_like(data)
        
        # Apply neon color where edges exist
        edge_mask = data[:, :, 0] > 50  # Threshold for edge detection
        
        for i in range(3):
            neon[:, :, i] = np.where(edge_mask, color[i], 0)
        
        neon_img = Image.fromarray(neon)
        
        # Create multiple glow layers
        glow_layers = []
        blur_radii = [1, 2, 4, 8]
        intensities = [1.0, 0.8, 0.6, 0.3]
        
        for radius, intensity in zip(blur_radii, intensities):
            glow = neon_img.filter(ImageFilter.GaussianBlur(radius=radius))
            glow_data = np.array(glow) * intensity
            glow_layers.append(glow_data)
        
        # Combine all glow layers
        combined_glow = np.zeros_like(data, dtype=float)
        for layer in glow_layers:
            combined_glow += layer
        
        # Normalize and convert back
        combined_glow = np.clip(combined_glow, 0, 255).astype(np.uint8)
        
        return Image.fromarray(combined_glow)
    
    def _create_dark_background(self, img: Image.Image) -> Image.Image:
        """Create dark, moody background"""
        data = np.array(img)
        
        # Darken the image significantly
        darkened = (data * 0.2).astype(np.uint8)
        
        # Add slight blue tint
        darkened[:, :, 2] = np.minimum(darkened[:, :, 2] + 20, 255)
        
        return Image.fromarray(darkened)
    
    def process_image(self, input_path: Path, output_path: Path) -> None:
        original_img = Image.open(input_path).convert("RGB")
        
        # Detect edges
        edges = self._detect_edges(original_img)
        
        # Create dark background
        dark_bg = self._create_dark_background(original_img)
        
        # Create multiple colored neon glows
        cyan_glow = self._create_neon_glow(edges, (0, 255, 255))
        magenta_glow = self._create_neon_glow(edges, (255, 0, 255))
        
        # Combine everything
        bg_data = np.array(dark_bg, dtype=float)
        cyan_data = np.array(cyan_glow, dtype=float)
        magenta_data = np.array(magenta_glow, dtype=float)
        
        # Blend with additive mode
        result = bg_data + cyan_data * 0.7 + magenta_data * 0.3
        result = np.clip(result, 0, 255).astype(np.uint8)
        
        final_img = Image.fromarray(result)
        
        # Enhance contrast for more dramatic effect
        enhancer = ImageEnhance.Contrast(final_img)
        final_img = enhancer.enhance(1.5)
        
        # Save result
        result_monad = MonadImage(PngImage(final_img))
        result_monad.bind(Save(output_path))