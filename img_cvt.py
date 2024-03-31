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

from monadage.image_variants import PngImage, SvgImage
   
def svg_to_png(image: SvgImage, temp_png_filepath: Path) -> PngImage:
    with open(image.svg_filepath) as so:
        cairosvg.surface.PNGSurface.convert(so.read(), write_to=temp_png_filepath, output_width=image.logical_dimensions[0], output_height=image.logical_dimensions[1])
    return PngImage(Image.open(temp_png_filepath).convert("RGBA"))


def monochrome_png_to_svg(input_image: PngImage, output_svg_path:Path, invert=True, color="#ffffff") -> SvgImage:
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