from typing import Callable, Type
from PIL import Image
import subprocess
import os
import numpy as np
import shutil
import cairosvg
from pathlib import Path

from monadage.image_func_def import MFunc
from monadage.image_variants import PngImage, SvgImage
from monadage.image_variants import ImageError, ImageVariant

import shlex


class Save(MFunc):
    def __init__(self, outpath: Path):
        self.outpath = outpath
        if self.outpath[-4:] == ".png":
            self.mode = PngImage
        elif self.outpath[-4:] == ".svg":
            self.mode = SvgImage
        else:
            self.mode = ImageError
        # print(f"save mode is {self.mode}")
        
    def get_mode(self) -> Type[ImageVariant]:
        return self.mode

    def __call__(self, image: ImageVariant) -> ImageVariant:
        if isinstance(image, PngImage):
            image.png.save(self.outpath)
            return image
        elif isinstance(image, SvgImage):
            subprocess.call(shlex.split(f"cp {image.svg_filepath} {self.outpath}"))
            return image
        else:
            return ImageError("TODO make image saving.")
        

class Quantize(MFunc):

    def __init__(self, n=2, method=1):
        self.n = n
        self.method = method

    def get_mode(self) -> ImageVariant:
        return PngImage
    
    def __call__(self, image: any) -> ImageVariant:
        """
        Quantizes an image to n colors (black and white if n=2).

        Args:
            image_path: Path to the input image file.
            output_path: Path to save the quantized image.
        """
        assert isinstance(image, PngImage)
        return PngImage(
            image.png.convert("RGB").quantize(colors=self.n, method=self.method)
        )


class RemoveBackground(MFunc):
    
    def get_mode(self) -> ImageVariant:
        return PngImage
    
    def __call__(self, image) -> ImageVariant:
        """
        Makes pixels with the most frequent color transparent.

        Args:
            image_path: Path to the input image file.
            output_path: Path to save the image with transparent background.
        """
        assert isinstance(image, PngImage)
        

        # Open the image
        image = image.png.convert("RGBA")  # Convert to RGBA for transparency

        # Get image dimensions
        width, height = image.size

        # Create a dictionary to store color counts
        color_counts = {}
        for y in range(height):
            for x in range(width):
                pixel = image.getpixel((x, y))
                # Count occurrences of each RGB value
                if pixel not in color_counts:
                    color_counts[pixel] = 0
                color_counts[pixel] += 1

        # Find the most frequent color (assumed background)
        dominant_color = max(color_counts, key=color_counts.get)

        # Make pixels matching dominant color transparent
        for y in range(height):
            for x in range(width):
                pixel = image.getpixel((x, y))
                if pixel == dominant_color:
                    image.putpixel((x, y), (0, 0, 0, 0))  # Set transparent (alpha 0)
                else:
                    image.putpixel((x, y), pixel)

        # Save the image with transparent background
        return PngImage(image)


class ApplyGrunge(MFunc):
    def __init__(self, grunge_img: PngImage | None, grunge_opacity=0.65, translate=(-390, -390),):
        self.grunge_img = grunge_img
        self.grunge_opacity = grunge_opacity
        self.translate = translate
        
    def get_mode(self) -> ImageVariant:
        return PngImage
    
    def __call__(self, image: any) -> ImageVariant:
        assert isinstance(image, PngImage)
        
        source_img = image

        if self.grunge_img is None:
            return source_img

        # Open the images
        source_img = source_img.png.convert("RGB")
        grunge_img = self.grunge_img.png.convert("RGB")

        # Resize the source image to match the grunge image dimensions
        resized_source = source_img.resize(grunge_img.size, Image.NEAREST)
        # Create a new image to store the result
        # result_img = Image.new("L", resized_source.size)

        sub_val = np.asarray(resized_source)
        min_val = np.asarray(grunge_img)

        gm = (min_val.astype(float) * self.grunge_opacity).astype(np.uint8)
        gm = np.roll(gm, self.translate, axis=(0, 1))
        subbed_img = np.where(sub_val > gm, sub_val - gm, 0)

        # Save the result to the output path
        return PngImage(Image.fromarray(subbed_img, "RGB").resize(source_img.size))


class ReplaceColorWithColorRGBA(MFunc):
    def __init__(self, to_replace=(0, 0, 0, 255), rep_with=(255, 255, 255, 255)):
        self.to_replace = to_replace
        self.rep_with = rep_with
    def get_mode(self) -> ImageVariant:
        return PngImage
    def __call__(self, image: any) -> ImageVariant:
        assert isinstance(image, PngImage)
        img = image.png

        # Convert the image to RGBA mode
        img = img.convert("RGBA")

        # Get the image data as a list of tuples
        image_data = list(img.getdata())

        # Create a new image data list with black pixels replaced by white
        new_image_data = []
        for pixel in image_data:
            if tuple(pixel[:]) == self.to_replace:
                # print("match")
                # If the pixel is fully transparent or black, replace with white
                new_image_data.append(self.rep_with)
            else:
                new_image_data.append(pixel)

        # Create a new image with the modified data
        new_img = Image.new("RGBA", img.size)
        new_img.putdata(new_image_data)

        # Save the new image
        return PngImage(img)

class PillowsOp(MFunc):
    def get_mode(self) -> ImageVariant:
        return PngImage
    def __init__(self, op: Callable[[Image.Image], Image.Image]) -> None:
        self.op = op
    def __call__(self, image: any) -> ImageVariant:
        assert isinstance(image, PngImage)
        return PngImage(self.op(image.png))