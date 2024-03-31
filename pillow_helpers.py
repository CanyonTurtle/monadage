from PIL import Image, ImageDraw

def add_corners(image, radicus_pct=15):

    # Load the image
    # image = Image.open("image.jpg")

    # Create a new image with a white background
    mask = Image.new("L", image.size, 255)

    # Draw a rounded rectangle on the mask
    draw = ImageDraw.Draw(mask)
    MARGIN = 0
    RADIUS = min(list(image.size)) * 15 // 100
    draw.rounded_rectangle((MARGIN, MARGIN, image.width - MARGIN, image.height - MARGIN), radius=RADIUS, fill=0)
    image_mask = draw._image
    # Apply the mask to the image
    image = Image.composite(Image.new("RGBA", image.size, (0,0,0,0)), image.convert("RGBA"), image_mask)

    # Save the image
    # image.save("image_with_rounded_bezels.jpg")
    return image