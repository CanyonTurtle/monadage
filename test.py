from image_tools import mi_quantize_to_n_colors, mi_save_png
from PIL import Image as pm

from IPython.display import Image
from monadage import PngImage, MI
from functools import partial

if __name__ == "__main__":
    im = PngImage(pm.open("images/in/etsy_shop_logo.png"))


    (MI(im)
        .bind(mi_quantize_to_n_colors)
        .bind(lambda im: mi_save_png(im, "images/out/test_save.png"))
    )