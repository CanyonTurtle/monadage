from PIL import Image, ImageDraw, ImageFont
from typing import Tuple

def add_corners(image, radius_pct=15):

    # Load the image
    # image = Image.open("image.jpg")

    # Create a new image with a white background
    mask = Image.new("L", image.size, 255)

    # Draw a rounded rectangle on the mask
    draw = ImageDraw.Draw(mask)
    MARGIN = 0
    RADIUS = min(list(image.size)) * radius_pct // 100
    draw.rounded_rectangle((MARGIN, MARGIN, image.width - MARGIN, image.height - MARGIN), radius=RADIUS, fill=0)
    image_mask = draw._image
    # Apply the mask to the image
    image = Image.composite(Image.new("RGBA", image.size, (0,0,0,0)), image.convert("RGBA"), image_mask)

    # Save the image
    # image.save("image_with_rounded_bezels.jpg")
    return image

def add_text(image, text: str, font_file:str=None, font_size: int = 96, pos: Tuple[int, int] = (10, 10), color= (0, 0, 0)):
    draw = ImageDraw.Draw(image)
    font = None
    if font_file is not None:
        font = ImageFont.truetype(font_file, font_size)
    draw.text(pos, text, color, font=font)
    return image