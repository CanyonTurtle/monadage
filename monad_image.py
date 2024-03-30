from __future__ import annotations

import PIL
from abc import ABC
from typing import Callable, Type, List, Tuple
from typing_extensions import assert_never
from functools import reduce
from pathlib import Path
import inspect


import os
from pathlib import Path
import subprocess
from PIL import Image
import cairosvg

class MonadImageVariant(ABC):
    pass

class PngImage(MonadImageVariant):
    def __init__(self, png: PIL.Image.Image):
        self.png = png

class SvgImage(MonadImageVariant):
    def __init__(self, svg_filepath: Path, logical_dimensions: Tuple[int, int]):
        self.svg_filepath = svg_filepath
        self.logical_dimensions = logical_dimensions

class ImageError(MonadImageVariant):
    def __init__(self, err_msg):
        self.err_msg = err_msg

class MI:


    def svg_to_png(self, image: SvgImage, temp_png_filepath: Path) -> PngImage:
        with open(image.svg_filepath) as so:
            cairosvg.surface.PNGSurface.convert(so.read(), write_to=temp_png_filepath, output_width=image.logical_dimensions[0], output_height=image.logical_dimensions[1])
        return PngImage(Image.open(temp_png_filepath).convert("RGBA"))


    def monochrome_png_to_svg(self, input_image: PngImage, output_svg_path:Path, invert=True, color="#ffffff") -> SvgImage:
        # Step 1: Convert PNG to PBM (Portable Bitmap) format
        pbm_file = "temp.pbm"
        img = input_image.png.convert("L")  # Convert to grayscale
        img.save(pbm_file)

        # Step 2: Use potrace to convert PBM to SVG
        command = ["potrace", "--invert", "--color", color, pbm_file, "-s", "-o", output_svg_path]
        if not invert:
            command.pop(1)
        subprocess.run(command)

        # Clean up temporary PBM file
        os.remove(pbm_file)
        
        return SvgImage(output_svg_path, img.size)

    def __init__(self, image: MonadImageVariant):
        self.image = image
    
    def bind(self, f: Callable[[MonadImageVariant], MI], mode: Type[MonadImageVariant] = PngImage) -> MI:
        print(f"binding {f} to {self.image}")
        match self.image:
            case PngImage():
                if mode == PngImage:
                    return f(self.image)
                elif mode == SvgImage:
                    return f(self.monochrome_png_to_svg(self.image, "temp.svg"))
                else:
                    return ImageError(f"Mode of bind not recognized: {mode}")
            case SvgImage():
                # convert to png to apply func
                if mode == SvgImage:
                    return f(self.image)
                elif mode == PngImage:
                    return f(self.svg_to_png(self.image, "temp.png"))
                else:
                    return ImageError(f"Mode of bind not recognized: {mode}")
            case ImageError():
                return self.image
            case _:
                # print(self.image.image)
                assert_never(self.image)
