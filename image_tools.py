from PIL import Image
import subprocess
import os
import numpy as np
import shutil
import cairosvg
from pathlib import Path

from monadage import PngImage, MI

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

