from pathlib import Path
from PIL import Image, ImageFilter, ImageEnhance
import numpy as np
import random
import math

from monadage.monad_image import MonadImage
from monadage.image_variants import PngImage
from monadage.imtools import Save
from .base import Pipeline


class PaperCutoutPipeline(Pipeline):
    """Creates layered paper cutout art with depth, shadows, and texture"""
    
    def __init__(self, num_layers: int = 5, shadow_intensity: float = 0.4, **kwargs):
        super().__init__(**kwargs)
        self.num_layers = num_layers
        self.shadow_intensity = shadow_intensity
    
    def get_name(self) -> str:
        return "paper_cutout"
    
    def get_description(self) -> str:
        return "Creates layered paper cutout art with depth, shadows, and texture"
    
    def _create_paper_texture(self, img: Image.Image) -> Image.Image:
        """Add paper-like texture to the image"""
        data = np.array(img).astype(float)
        height, width = data.shape[:2]
        
        # Create paper grain texture
        grain = np.random.normal(0, 8, (height, width))
        
        # Add fibrous texture pattern
        for y in range(height):
            for x in range(width):
                # Create subtle directional fibers
                fiber_strength = 3 * math.sin(x * 0.1 + y * 0.05) * math.cos(x * 0.05)
                grain[y, x] += fiber_strength
        
        # Apply texture to each channel
        textured = data.copy()
        for channel in range(3):
            textured[:, :, channel] += grain * 0.5
        
        return Image.fromarray(np.clip(textured, 0, 255).astype(np.uint8))
    
    def _quantize_colors(self, img: Image.Image, num_colors: int) -> Image.Image:
        """Quantize colors to create distinct paper layers"""
        # Use PIL's quantization for clean color separation
        quantized = img.quantize(colors=num_colors, method=Image.MEDIANCUT)
        return quantized.convert("RGB")
    
    def _create_layer_separation(self, img: Image.Image) -> list:
        """Separate image into distinct layers by color/brightness"""
        data = np.array(img)
        height, width = data.shape[:2]
        
        # Convert to HSV for better color separation
        hsv_img = img.convert("HSV")
        hsv_data = np.array(hsv_img)
        
        # Create layers based on value (brightness)
        layers = []
        
        for i in range(self.num_layers):
            # Create brightness threshold for this layer
            threshold_min = int(i * 255 / self.num_layers)
            threshold_max = int((i + 1) * 255 / self.num_layers)
            
            # Create mask for this brightness range
            value_channel = hsv_data[:, :, 2]
            mask = (value_channel >= threshold_min) & (value_channel < threshold_max)
            
            # Create layer image
            layer_data = data.copy()
            layer_data[~mask] = [255, 255, 255]  # White background for non-masked areas
            
            layers.append(Image.fromarray(layer_data))
        
        return layers
    
    def _add_drop_shadow(self, layer: Image.Image, offset_x: int, offset_y: int) -> Image.Image:
        """Add drop shadow to a layer"""
        # Create shadow by shifting and darkening
        shadow_data = np.array(layer)
        height, width = shadow_data.shape[:2]
        
        # Create shadow canvas
        shadow_canvas = np.full((height, width, 3), 255, dtype=np.uint8)
        
        # Calculate shadow bounds
        shadow_start_x = max(0, offset_x)
        shadow_end_x = min(width, width + offset_x)
        shadow_start_y = max(0, offset_y)
        shadow_end_y = min(height, height + offset_y)
        
        source_start_x = max(0, -offset_x)
        source_end_x = min(width, width - offset_x)
        source_start_y = max(0, -offset_y)
        source_end_y = min(height, height - offset_y)
        
        # Create shadow mask (non-white pixels)
        shadow_mask = np.any(shadow_data != [255, 255, 255], axis=2)
        
        # Place shadow
        if shadow_start_x < shadow_end_x and shadow_start_y < shadow_end_y:
            shadow_region = shadow_mask[source_start_y:source_end_y, source_start_x:source_end_x]
            shadow_canvas[shadow_start_y:shadow_end_y, shadow_start_x:shadow_end_x][shadow_region] = [80, 80, 80]
        
        # Blur shadow for soft effect
        shadow_img = Image.fromarray(shadow_canvas)
        blurred_shadow = shadow_img.filter(ImageFilter.GaussianBlur(radius=3))
        
        return blurred_shadow
    
    def _create_layered_composition(self, layers: list) -> Image.Image:
        """Compose layers with shadows and depth"""
        if not layers:
            return layers[0]
        
        # Start with bottom layer
        height, width = np.array(layers[0]).shape[:2]
        composition = np.full((height, width, 3), 255, dtype=np.uint8)
        
        # Add layers from bottom to top
        for i, layer in enumerate(layers):
            # Calculate shadow offset (higher layers have more offset)
            shadow_offset_x = (i + 1) * 3
            shadow_offset_y = (i + 1) * 3
            
            # Create and add shadow
            shadow = self._add_drop_shadow(layer, shadow_offset_x, shadow_offset_y)
            shadow_data = np.array(shadow)
            
            # Blend shadow with composition
            shadow_mask = shadow_data < 200  # Dark shadow areas
            composition[shadow_mask] = (
                composition[shadow_mask] * (1 - self.shadow_intensity) + 
                shadow_data[shadow_mask] * self.shadow_intensity
            ).astype(np.uint8)
            
            # Add the layer itself
            layer_data = np.array(layer)
            layer_mask = np.any(layer_data != [255, 255, 255], axis=2)
            composition[layer_mask] = layer_data[layer_mask]
        
        return Image.fromarray(composition)
    
    def _add_paper_edges(self, img: Image.Image) -> Image.Image:
        """Add slightly torn/cut paper edges"""
        data = np.array(img)
        height, width = data.shape[:2]
        
        # Create edge mask with slight roughness
        edge_mask = np.ones((height, width), dtype=bool)
        
        # Add roughness to edges
        edge_roughness = 5
        
        # Top and bottom edges
        for x in range(width):
            roughness_top = random.randint(0, edge_roughness)
            roughness_bottom = random.randint(0, edge_roughness)
            edge_mask[:roughness_top, x] = False
            edge_mask[height-roughness_bottom:, x] = False
        
        # Left and right edges
        for y in range(height):
            roughness_left = random.randint(0, edge_roughness)
            roughness_right = random.randint(0, edge_roughness)
            edge_mask[y, :roughness_left] = False
            edge_mask[y, width-roughness_right:] = False
        
        # Apply edge mask
        result = data.copy()
        result[~edge_mask] = [255, 255, 255]
        
        return Image.fromarray(result)
    
    def _enhance_paper_colors(self, img: Image.Image) -> Image.Image:
        """Enhance colors to look like colored paper"""
        # Slightly desaturate for paper-like appearance
        enhancer = ImageEnhance.Color(img)
        desaturated = enhancer.enhance(0.8)
        
        # Increase brightness slightly
        enhancer = ImageEnhance.Brightness(desaturated)
        brightened = enhancer.enhance(1.1)
        
        # Add slight contrast
        enhancer = ImageEnhance.Contrast(brightened)
        contrasted = enhancer.enhance(1.1)
        
        return contrasted
    
    def process_image(self, input_path: Path, output_path: Path) -> None:
        original_img = Image.open(input_path).convert("RGB")
        
        # Quantize colors for distinct paper layers
        quantized = self._quantize_colors(original_img, self.num_layers * 2)
        
        # Create paper texture
        textured = self._create_paper_texture(quantized)
        
        # Separate into layers
        layers = self._create_layer_separation(textured)
        
        # Create layered composition with shadows
        composition = self._create_layered_composition(layers)
        
        # Add paper edges
        paper_edges = self._add_paper_edges(composition)
        
        # Enhance colors for paper appearance
        enhanced = self._enhance_paper_colors(paper_edges)
        
        # Save result
        result_monad = MonadImage(PngImage(enhanced))
        result_monad.bind(Save(output_path))