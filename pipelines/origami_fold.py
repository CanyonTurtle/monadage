from pathlib import Path
from PIL import Image, ImageFilter, ImageEnhance, ImageDraw
import numpy as np
import random
import math

from monadage.monad_image import MonadImage
from monadage.image_variants import PngImage
from monadage.imtools import Save
from .base import Pipeline


class OrigamiFoldPipeline(Pipeline):
    """Creates origami fold patterns with geometric creases and dimensional depth"""
    
    def __init__(self, fold_complexity: int = 8, crease_sharpness: float = 0.7, **kwargs):
        super().__init__(**kwargs)
        self.fold_complexity = fold_complexity
        self.crease_sharpness = crease_sharpness
    
    def get_name(self) -> str:
        return "origami_fold"
    
    def get_description(self) -> str:
        return "Creates origami fold patterns with geometric creases and dimensional depth"
    
    def _create_fold_lines(self, width: int, height: int) -> list:
        """Generate geometric fold lines"""
        fold_lines = []
        
        # Create different types of fold patterns
        fold_types = ['diagonal', 'radial', 'grid', 'spiral']
        
        for _ in range(self.fold_complexity):
            fold_type = random.choice(fold_types)
            
            if fold_type == 'diagonal':
                # Diagonal fold lines
                x1 = random.randint(0, width)
                y1 = random.randint(0, height)
                angle = random.uniform(0, 2 * math.pi)
                length = random.randint(min(width, height) // 4, min(width, height) // 2)
                
                x2 = x1 + int(length * math.cos(angle))
                y2 = y1 + int(length * math.sin(angle))
                
                fold_lines.append({
                    'type': 'line',
                    'points': [(x1, y1), (x2, y2)],
                    'strength': random.uniform(0.3, 1.0)
                })
            
            elif fold_type == 'radial':
                # Radial folds from center point
                center_x = random.randint(width // 4, 3 * width // 4)
                center_y = random.randint(height // 4, 3 * height // 4)
                
                num_rays = random.randint(6, 12)
                for i in range(num_rays):
                    angle = (2 * math.pi * i) / num_rays
                    length = random.randint(50, min(width, height) // 3)
                    
                    end_x = center_x + int(length * math.cos(angle))
                    end_y = center_y + int(length * math.sin(angle))
                    
                    fold_lines.append({
                        'type': 'line',
                        'points': [(center_x, center_y), (end_x, end_y)],
                        'strength': random.uniform(0.4, 0.8)
                    })
            
            elif fold_type == 'grid':
                # Grid-based folds
                grid_size = random.randint(3, 6)
                for i in range(grid_size):
                    # Vertical lines
                    x = int(width * (i + 1) / (grid_size + 1))
                    fold_lines.append({
                        'type': 'line',
                        'points': [(x, 0), (x, height)],
                        'strength': random.uniform(0.2, 0.6)
                    })
                    
                    # Horizontal lines
                    y = int(height * (i + 1) / (grid_size + 1))
                    fold_lines.append({
                        'type': 'line',
                        'points': [(0, y), (width, y)],
                        'strength': random.uniform(0.2, 0.6)
                    })
            
            elif fold_type == 'spiral':
                # Spiral fold pattern
                center_x = width // 2
                center_y = height // 2
                points = []
                
                for t in range(0, 720, 20):  # Two full rotations
                    angle = math.radians(t)
                    radius = t * 0.3
                    
                    x = center_x + int(radius * math.cos(angle))
                    y = center_y + int(radius * math.sin(angle))
                    
                    if 0 <= x < width and 0 <= y < height:
                        points.append((x, y))
                
                if len(points) > 1:
                    fold_lines.append({
                        'type': 'curve',
                        'points': points,
                        'strength': random.uniform(0.3, 0.7)
                    })
        
        return fold_lines
    
    def _apply_fold_shading(self, img: Image.Image, fold_lines: list) -> Image.Image:
        """Apply shading along fold lines to create depth"""
        data = np.array(img).astype(float)
        height, width = data.shape[:2]
        
        # Create distance field for each fold line
        for fold in fold_lines:
            if fold['type'] == 'line':
                p1, p2 = fold['points']
                strength = fold['strength']
                
                # Create distance field to line
                for y in range(height):
                    for x in range(width):
                        # Distance from point to line segment
                        distance = self._point_to_line_distance(x, y, p1, p2)
                        
                        # Apply shading based on distance
                        if distance < 20:  # Within fold influence
                            # Calculate shading intensity
                            intensity = (20 - distance) / 20
                            shading = intensity * strength * self.crease_sharpness
                            
                            # Determine if it's a valley or mountain fold
                            is_valley = random.random() < 0.5
                            
                            if is_valley:
                                # Darken for valley fold
                                data[y, x] *= (1 - shading * 0.3)
                            else:
                                # Lighten for mountain fold
                                data[y, x] *= (1 + shading * 0.2)
            
            elif fold['type'] == 'curve':
                points = fold['points']
                strength = fold['strength']
                
                # Apply shading along curve
                for i in range(len(points) - 1):
                    p1, p2 = points[i], points[i + 1]
                    
                    # Similar to line shading but for curve segments
                    for y in range(height):
                        for x in range(width):
                            distance = self._point_to_line_distance(x, y, p1, p2)
                            
                            if distance < 15:
                                intensity = (15 - distance) / 15
                                shading = intensity * strength * self.crease_sharpness
                                
                                # Spiral folds alternate valley/mountain
                                is_valley = i % 2 == 0
                                
                                if is_valley:
                                    data[y, x] *= (1 - shading * 0.25)
                                else:
                                    data[y, x] *= (1 + shading * 0.15)
        
        return Image.fromarray(np.clip(data, 0, 255).astype(np.uint8))
    
    def _point_to_line_distance(self, px: int, py: int, p1: tuple, p2: tuple) -> float:
        """Calculate distance from point to line segment"""
        x1, y1 = p1
        x2, y2 = p2
        
        # Vector from p1 to p2
        dx = x2 - x1
        dy = y2 - y1
        
        # If line segment is a point
        if dx == 0 and dy == 0:
            return math.sqrt((px - x1)**2 + (py - y1)**2)
        
        # Calculate parameter t
        t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)
        
        # Clamp t to [0, 1] for line segment
        t = max(0, min(1, t))
        
        # Find closest point on line segment
        closest_x = x1 + t * dx
        closest_y = y1 + t * dy
        
        # Return distance to closest point
        return math.sqrt((px - closest_x)**2 + (py - closest_y)**2)
    
    def _create_geometric_facets(self, img: Image.Image, fold_lines: list) -> Image.Image:
        """Create geometric facets between fold lines"""
        data = np.array(img).astype(float)
        height, width = data.shape[:2]
        
        # Create regions between fold lines
        num_regions = random.randint(20, 40)
        
        for _ in range(num_regions):
            # Create random polygonal region
            num_vertices = random.randint(3, 6)
            vertices = []
            
            for _ in range(num_vertices):
                x = random.randint(0, width)
                y = random.randint(0, height)
                vertices.append((x, y))
            
            # Create mask for this region
            mask = self._create_polygon_mask(vertices, width, height)
            
            if np.any(mask):
                # Apply subtle color/brightness variation to create facet effect
                color_shift = random.uniform(-0.1, 0.1)
                brightness_shift = random.uniform(-0.05, 0.05)
                
                # Apply shifts to the region
                region_data = data[mask]
                region_data *= (1 + brightness_shift)
                region_data += color_shift * 20
                
                data[mask] = region_data
        
        return Image.fromarray(np.clip(data, 0, 255).astype(np.uint8))
    
    def _create_polygon_mask(self, vertices: list, width: int, height: int) -> np.ndarray:
        """Create a boolean mask for a polygon"""
        # Create temporary image for polygon
        temp_img = Image.new('L', (width, height), 0)
        draw = ImageDraw.Draw(temp_img)
        
        if len(vertices) >= 3:
            draw.polygon(vertices, fill=255)
        
        # Convert to boolean mask
        mask = np.array(temp_img) > 128
        
        return mask
    
    def _add_crease_lines(self, img: Image.Image, fold_lines: list) -> Image.Image:
        """Draw visible crease lines"""
        result = img.copy()
        draw = ImageDraw.Draw(result)
        
        for fold in fold_lines:
            if fold['type'] == 'line':
                p1, p2 = fold['points']
                strength = fold['strength']
                
                # Draw crease line
                line_color = (
                    int(100 * strength),
                    int(100 * strength),
                    int(100 * strength)
                )
                
                draw.line([p1, p2], fill=line_color, width=1)
            
            elif fold['type'] == 'curve':
                points = fold['points']
                strength = fold['strength']
                
                # Draw curve as connected line segments
                line_color = (
                    int(80 * strength),
                    int(80 * strength),
                    int(80 * strength)
                )
                
                for i in range(len(points) - 1):
                    draw.line([points[i], points[i + 1]], fill=line_color, width=1)
        
        return result
    
    def process_image(self, input_path: Path, output_path: Path) -> None:
        original_img = Image.open(input_path).convert("RGB")
        
        # Generate fold lines
        fold_lines = self._create_fold_lines(original_img.width, original_img.height)
        
        # Apply fold shading for depth
        shaded = self._apply_fold_shading(original_img, fold_lines)
        
        # Create geometric facets
        faceted = self._create_geometric_facets(shaded, fold_lines)
        
        # Add visible crease lines
        creased = self._add_crease_lines(faceted, fold_lines)
        
        # Enhance contrast for more defined folds
        enhancer = ImageEnhance.Contrast(creased)
        enhanced = enhancer.enhance(1.2)
        
        # Slight sharpening for crisp edges
        sharpened = enhanced.filter(ImageFilter.UnsharpMask(radius=0.5, percent=100, threshold=3))
        
        # Save result
        result_monad = MonadImage(PngImage(sharpened))
        result_monad.bind(Save(output_path))