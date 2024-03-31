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

from monadage.image_func_def import MFunc
from monadage.image_variants import ImageError, ImageVariant, PngImage, SvgImage
from monadage.img_cvt import monochrome_png_to_svg, svg_to_png



class MonadImage:

    def __init__(self, image: ImageVariant):
        self.image = image
    
    def bind(self, f: MFunc) -> MonadImage:
        # print(f"binding {f} to {self.image}")
        match self.image:
            case PngImage():
                if f.get_mode() == PngImage:
                    return MonadImage(f(self.image))
                elif f.get_mode() == SvgImage:
                    return MonadImage(f(monochrome_png_to_svg(self.image, "temp.svg")))
                else:
                    return MonadImage(ImageError(f"Mode of bind not recognized: {f.get_mode()}"))
            case SvgImage():
                # convert to png to apply func
                if f.get_mode() == SvgImage:
                    return MonadImage(f(self.image))
                elif f.get_mode() == PngImage:
                    return MonadImage(f(svg_to_png(self.image, "temp.png")))
                else:
                    return MonadImage(ImageError(f"Mode of bind not recognized: {f.get_mode()}"))
            case ImageError():
                return MonadImage(self.image)
            case _:
                # print(self.image.image)
                assert_never(self.image)
