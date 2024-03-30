from PIL import Image
import subprocess
import os
import numpy as np
import shutil
import cairosvg
from pathlib import Path

from monadage.monad_image import PngImage, MI, SvgImage

def mi_to_png(image: PngImage) -> MI:
  return MI(image)

def mi_to_svg(image: SvgImage) -> MI:
  return MI(image)

def mi_quantize_to_n_colors(image: PngImage, n=2, method=1) -> MI:
  """
  Quantizes an image to n colors (black and white if n=2).

  Args:
      image_path: Path to the input image file.
      output_path: Path to save the quantized image.
  """  
  
  # Open the image
  return MI(PngImage(image.png.convert("RGB").quantize(colors=n, method=method)))
  
def mi_save_png(image: PngImage, path: Path):
  image.png.save(path)
  return MI(image)

def mi_remove_background(image: PngImage) -> MI:
  """
  Makes pixels with the most frequent color transparent.

  Args:
      image_path: Path to the input image file.
      output_path: Path to save the image with transparent background.
  """
  # Open the image
  image = image.png.convert('RGBA')  # Convert to RGBA for transparency

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
  return MI(PngImage(image))

  
def apply_grunge(source_img: PngImage, grunge_img: PngImage | None, grunge_opacity=0.65, translate=(-390,-390)) -> MI:
    if grunge_img is None:
        return MI(source_img)

    # Open the images
    source_img = source_img.png.convert("RGB")
    grunge_img = grunge_img.png.convert("RGB")

    # Resize the source image to match the grunge image dimensions
    resized_source = source_img.resize(grunge_img.size, Image.NEAREST)
    # Create a new image to store the result
    # result_img = Image.new("L", resized_source.size)

    sub_val = np.asarray(resized_source)
    min_val = np.asarray(grunge_img)
    
    gm = (min_val.astype(float)*grunge_opacity).astype(np.uint8)
    gm = np.roll(gm, translate, axis=(0, 1))
    subbed_img = np.where(sub_val > gm, sub_val - gm, 0)
    
    
    
    # Save the result to the output path
    return MI(PngImage(Image.fromarray(subbed_img, "RGB").resize(source_img.size)))
  
  
def replace_color_with_color_rgba(image: PngImage, to_replace=(0,0,0,255), rep_with=(255,255,255,255)) -> MI:
    # Open the image
    print("running")
    img = image.png

    # Convert the image to RGBA mode
    img = img.convert("RGBA")

    # Get the image data as a list of tuples
    image_data = list(img.getdata())

    # Create a new image data list with black pixels replaced by white
    new_image_data = []
    for pixel in image_data:
        if tuple(pixel[:]) == to_replace:
            #print("match")
            # If the pixel is fully transparent or black, replace with white
            new_image_data.append(rep_with)
        else:
            new_image_data.append(pixel)

    # Create a new image with the modified data
    new_img = Image.new("RGBA", img.size)
    new_img.putdata(new_image_data)

    # Save the new image
    return MI(PngImage(img))
