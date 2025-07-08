from pathlib import Path
from PIL import Image
import numpy as np
import random

from monadage.monad_image import MonadImage
from monadage.image_variants import PngImage
from monadage.imtools import Save, Quantize
from .base import Pipeline


class PixelSortPipeline(Pipeline):
    """Creates pixel sorting effects for glitchy digital art"""
    
    def __init__(self, sort_strength: float = 0.3, **kwargs):
        super().__init__(**kwargs)
        self.sort_strength = sort_strength
    
    def get_name(self) -> str:
        return "pixel_sort"
    
    def get_description(self) -> str:
        return f"Creates pixel sorting effects with {self.sort_strength} strength"
    
    def _brightness(self, pixel):
        """Calculate pixel brightness"""
        return 0.299 * pixel[0] + 0.587 * pixel[1] + 0.114 * pixel[2]
    
    def _should_sort_pixel(self, pixel, threshold=100):
        """Determine if pixel should be included in sorting"""
        return self._brightness(pixel) > threshold
    
    def _sort_row(self, row):
        """Sort pixels in a row based on brightness"""
        result = row.copy()
        
        # Find continuous segments to sort
        i = 0
        while i < len(row):
            if self._should_sort_pixel(row[i]):
                # Start of a segment to sort
                start = i
                while i < len(row) and self._should_sort_pixel(row[i]):
                    i += 1
                end = i
                
                # Sort this segment by brightness
                if end - start > 5:  # Only sort segments longer than 5 pixels
                    segment = row[start:end]
                    segment_with_brightness = [(self._brightness(pixel), pixel) for pixel in segment]
                    segment_with_brightness.sort(key=lambda x: x[0])
                    
                    # Apply sorting with some randomness
                    if random.random() < self.sort_strength:
                        for j, (_, pixel) in enumerate(segment_with_brightness):
                            result[start + j] = pixel
            else:
                i += 1
        
        return result
    
    def _sort_column(self, column):
        """Sort pixels in a column based on brightness"""
        return self._sort_row(column)  # Same logic
    
    def process_image(self, input_path: Path, output_path: Path) -> None:
        original_img = Image.open(input_path).convert("RGB")
        data = np.array(original_img)
        height, width = data.shape[:2]
        
        result = data.copy()
        
        # Sort random rows
        for y in range(height):
            if random.random() < 0.3:  # Sort 30% of rows
                result[y] = self._sort_row(result[y])
        
        # Sort random columns
        for x in range(width):
            if random.random() < 0.2:  # Sort 20% of columns
                column = result[:, x]
                result[:, x] = self._sort_column(column)
        
        # Create result image
        sorted_img = Image.fromarray(result)
        
        # Apply quantization for cleaner look
        result_monad = MonadImage(PngImage(sorted_img))
        result_monad.bind(Quantize(n=8, method=1)).bind(Save(output_path))