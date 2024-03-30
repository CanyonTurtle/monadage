from __future__ import annotations

from PIL import Image
from abc import ABC
from typing import Callable, Type, List, Tuple
from typing_extensions import assert_never
from functools import reduce
import inspect

class MonadImageVariant(ABC):
    pass

class PngImage(MonadImageVariant):
    def __init__(self, png: Image):
        self.png = png
    def __repr__(self):
        return self.png

class SvgImage(MonadImageVariant):
    def __init__(self, svg, logical_dimensions: Tuple[int, int]):
        self.svg = svg
        self.logical_dimensions = logical_dimensions
    def __repr__(self):
        return self.svg
class ImageError(MonadImageVariant):
    def __init__(self, err_msg):
        self.err_msg = err_msg
    def __repr__(self):
        return self.err_msg

class MI:

    def __init__(self, image: MonadImageVariant):
        self.image = image
    
    def bind(self, f: Callable[[MonadImageVariant], MI], mode: Type[MonadImageVariant] = PngImage) -> MI:
        match self.image:
            case PngImage():
                if mode == PngImage:
                    return f(self.image)
                else:
                    return ImageError("TODO convert from png")
            case SvgImage():
                # convert to png to apply func
                pass
                return ImageError("Cannot process svg")
            case ImageError():
                return self.image
            case _:
                assert_never(self.image)
    def chain_processing(self, *functions: Callable[[MonadImageVariant], MI]) -> MI:
        result = self
        for func in functions:
            result = MI.bind(result, func)
        return result
    def __repr__(self):
        match self.image:
            case PngImage():
                return f"Png is: {self.image}"
if __name__ == "__main__":
    png = MI(PngImage("hi"))
    svg = MI(SvgImage("svg", (100, 100)))
    
    def png_func(png: PngImage) -> MI:
        
        return MI(PngImage(f"modified png: {png.png}"))
        
    print(png.bind(png_func))
    print(svg.bind(png_func))
    print(png)
    print(png.chain_processing(
        png_func,
        png_func
    ))
    print(png)
    