from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np
import math

from monadage.monad_image import MonadImage
from monadage.image_variants import PngImage
from monadage.imtools import Save, Quantize
from .base import Pipeline


class GeometricTelescopePipeline(Pipeline):
    """Creates geometric patterns with triangular mirroring and sharp angular reflections"""
    
    def __init__(self, segments: int = 6, **kwargs):
        super().__init__(**kwargs)
        self.segments = segments
    
    def get_name(self) -> str:
        return "geometric_telescope"
    
    def get_description(self) -> str:
        return f"Creates sharp geometric patterns with {self.segments} triangular mirror segments"
    
    def _create_geometric_pattern(self, img: Image.Image) -> Image.Image:
        """Create geometric mirroring with sharp triangular segments"""
        # Make image square
        size = min(img.size)
        img = img.resize((size, size), Image.LANCZOS)
        
        data = np.array(img)
        height, width = data.shape[:2]
        center_x, center_y = width // 2, height // 2
        
        result = np.zeros_like(data)
        
        # Angle per segment
        segment_angle = 2 * math.pi / self.segments
        
        for y in range(height):
            for x in range(width):
                # Convert to polar coordinates
                dx = x - center_x
                dy = y - center_y
                radius = math.sqrt(dx*dx + dy*dy)
                
                if radius == 0:
                    result[y, x] = data[center_y, center_x]
                    continue
                
                angle = math.atan2(dy, dx)
                if angle < 0:
                    angle += 2 * math.pi
                
                # Find which segment this angle belongs to
                segment = int(angle / segment_angle)
                
                # Calculate angle within the segment (0 to segment_angle)
                local_angle = angle - segment * segment_angle
                
                # Create triangular mirroring within each segment
                # Mirror around the center line of each segment
                mid_segment_angle = segment_angle / 2
                
                if local_angle > mid_segment_angle:
                    # Mirror the second half to the first half
                    local_angle = segment_angle - local_angle
                
                # Convert back to global angle
                mirrored_angle = segment * segment_angle + local_angle
                
                # Convert back to cartesian coordinates
                new_x = center_x + radius * math.cos(mirrored_angle)
                new_y = center_y + radius * math.sin(mirrored_angle)
                
                # Clamp to image bounds
                new_x = max(0, min(width - 1, int(new_x)))
                new_y = max(0, min(height - 1, int(new_y)))
                
                result[y, x] = data[new_y, new_x]
        
        return Image.fromarray(result)
    
    def _add_geometric_grid(self, img: Image.Image) -> Image.Image:
        """Add geometric grid overlay to enhance the pattern"""
        draw = ImageDraw.Draw(img)
        width, height = img.size
        center_x, center_y = width // 2, height // 2
        
        # Draw radial lines
        for i in range(self.segments):
            angle = i * 2 * math.pi / self.segments
            end_x = center_x + (width // 2) * math.cos(angle)
            end_y = center_y + (width // 2) * math.sin(angle)
            draw.line([(center_x, center_y), (end_x, end_y)], fill=(255, 255, 255), width=2)
        
        # Draw concentric circles
        for radius in range(50, width // 2, 50):
            bbox = [center_x - radius, center_y - radius, center_x + radius, center_y + radius]
            draw.ellipse(bbox, outline=(255, 255, 255), width=1)
        
        return img
    
    def _create_triangular_masks(self, img: Image.Image) -> Image.Image:
        """Create sharp triangular segment boundaries"""
        width, height = img.size
        center_x, center_y = width // 2, height // 2
        
        # Create a mask for sharp geometric boundaries
        mask = Image.new('L', (width, height), 0)
        draw = ImageDraw.Draw(mask)
        
        segment_angle = 2 * math.pi / self.segments
        
        for i in range(self.segments):
            # Calculate triangle points for each segment
            angle1 = i * segment_angle
            angle2 = (i + 1) * segment_angle
            mid_angle = angle1 + segment_angle / 2
            
            radius = width // 2
            
            # Triangle vertices
            p1 = (center_x, center_y)  # Center
            p2 = (center_x + radius * math.cos(angle1), center_y + radius * math.sin(angle1))
            p3 = (center_x + radius * math.cos(angle2), center_y + radius * math.sin(angle2))
            
            # Draw triangle for this segment
            draw.polygon([p1, p2, p3], fill=255 if i % 2 == 0 else 128)
        
        # Apply mask to create sharp segment boundaries
        img_data = np.array(img)
        mask_data = np.array(mask)
        
        # Enhance contrast at segment boundaries
        for channel in range(3):
            img_data[:, :, channel] = np.where(
                mask_data == 255,
                np.minimum(img_data[:, :, channel] * 1.2, 255),
                img_data[:, :, channel] * 0.8
            )
        
        return Image.fromarray(img_data.astype(np.uint8))
    
    def process_image(self, input_path: Path, output_path: Path) -> None:
        original_img = Image.open(input_path).convert("RGB")
        
        # Create geometric mirroring pattern
        geometric = self._create_geometric_pattern(original_img)
        
        # Add triangular masking for sharp boundaries
        geometric = self._create_triangular_masks(geometric)
        
        # Add geometric grid overlay
        geometric = self._add_geometric_grid(geometric)
        
        # Enhance with quantization for crisp geometric look
        result_monad = MonadImage(PngImage(geometric))
        result_monad.bind(Quantize(n=8, method=1)).bind(Save(output_path))