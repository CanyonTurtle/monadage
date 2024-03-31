
from abc import ABC
from pathlib import Path
from typing import Tuple

import PIL


class ImageVariant(ABC):
    pass

class PngImage(ImageVariant):
    def __init__(self, png: PIL.Image.Image):
        self.png = png

class SvgImage(ImageVariant):
    def __init__(self, svg_filepath: Path, logical_dimensions: Tuple[int, int]):
        self.svg_filepath = svg_filepath
        self.logical_dimensions = logical_dimensions


class ImageError(ImageVariant):
    def __init__(self, err_msg):
        self.err_msg = err_msg
    def __repr__(self):
        return self.err_msg