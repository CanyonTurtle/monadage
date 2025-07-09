from pathlib import Path
from PIL import Image, ImageFilter, ImageEnhance, ImageDraw, ImageFont
import numpy as np
import random
import math

from monadage.monad_image import MonadImage
from monadage.image_variants import PngImage
from monadage.imtools import Save
from .base import Pipeline


class DigitalRainPipeline(Pipeline):
    """Creates Matrix-style digital rain effect cascading over the image"""
    
    def __init__(self, rain_density: float = 0.3, cascade_speed: float = 0.5, **kwargs):
        super().__init__(**kwargs)
        self.rain_density = rain_density
        self.cascade_speed = cascade_speed
    
    def get_name(self) -> str:
        return "digital_rain"
    
    def get_description(self) -> str:
        return "Creates Matrix-style digital rain effect cascading over the image"
    
    def _create_digital_characters(self) -> list:
        """Create a set of digital/matrix-style characters"""
        # Japanese katakana, numbers, and symbols for matrix effect
        characters = [
            'ア', 'イ', 'ウ', 'エ', 'オ', 'カ', 'キ', 'ク', 'ケ', 'コ',
            'サ', 'シ', 'ス', 'セ', 'ソ', 'タ', 'チ', 'ツ', 'テ', 'ト',
            'ナ', 'ニ', 'ヌ', 'ネ', 'ノ', 'ハ', 'ヒ', 'フ', 'ヘ', 'ホ',
            'マ', 'ミ', 'ム', 'メ', 'モ', 'ヤ', 'ユ', 'ヨ', 'ラ', 'リ',
            'ル', 'レ', 'ロ', 'ワ', 'ヲ', 'ン',
            '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
            ':', '·', '"', '=', '*', '+', '-', '<', '>', '¦', '|', '¡'
        ]
        return characters
    
    def _darken_image(self, img: Image.Image) -> Image.Image:
        """Darken the image to create matrix-like background"""
        enhancer = ImageEnhance.Brightness(img)
        darkened = enhancer.enhance(0.2)
        
        # Add green tint
        data = np.array(darkened).astype(float)
        
        # Enhance green channel and reduce others
        data[:, :, 0] *= 0.5  # Reduce red
        data[:, :, 1] *= 1.2  # Enhance green
        data[:, :, 2] *= 0.5  # Reduce blue
        
        return Image.fromarray(np.clip(data, 0, 255).astype(np.uint8))
    
    def _create_rain_columns(self, width: int, height: int) -> list:
        """Create digital rain columns"""
        columns = []
        char_width = 12
        char_height = 16
        
        num_columns = int(width / char_width * self.rain_density)
        
        for _ in range(num_columns):
            column = {
                'x': random.randint(0, width - char_width),
                'chars': [],
                'speed': random.uniform(0.5, 2.0) * self.cascade_speed
            }
            
            # Create character trail
            trail_length = random.randint(8, 25)
            for i in range(trail_length):
                char_info = {
                    'y': random.randint(-height, 0) + i * char_height,
                    'char': random.choice(self._create_digital_characters()),
                    'brightness': 1.0 - (i / trail_length) * 0.8,  # Fade trail
                    'change_timer': random.randint(1, 10)
                }
                column['chars'].append(char_info)
            
            columns.append(column)
        
        return columns
    
    def _render_rain_frame(self, img: Image.Image, columns: list) -> Image.Image:
        """Render a single frame of digital rain"""
        result = img.copy()
        draw = ImageDraw.Draw(result)
        
        # Try to use a monospace font, fallback to default
        font_size = 14
        try:
            font = ImageFont.truetype("DejaVuSansMono.ttf", font_size)
        except:
            try:
                font = ImageFont.load_default()
            except:
                font = None
        
        height = img.height
        
        for column in columns:
            for char_info in column['chars']:
                if 0 <= char_info['y'] <= height:
                    # Calculate color based on brightness
                    green_value = int(255 * char_info['brightness'])
                    
                    # Leading character is brightest white
                    if char_info == column['chars'][0]:
                        color = (255, 255, 255)
                    else:
                        color = (0, green_value, 0)
                    
                    # Draw character
                    try:
                        draw.text(
                            (column['x'], char_info['y']),
                            char_info['char'],
                            fill=color,
                            font=font
                        )
                    except:
                        # Fallback if font fails
                        draw.text(
                            (column['x'], char_info['y']),
                            char_info['char'],
                            fill=color
                        )
        
        return result
    
    def _update_rain_columns(self, columns: list, height: int) -> None:
        """Update rain column positions and characters"""
        char_height = 16
        
        for column in columns:
            # Move characters down
            for char_info in column['chars']:
                char_info['y'] += int(column['speed'] * char_height)
                
                # Randomly change character
                char_info['change_timer'] -= 1
                if char_info['change_timer'] <= 0:
                    char_info['char'] = random.choice(self._create_digital_characters())
                    char_info['change_timer'] = random.randint(1, 10)
            
            # Reset characters that have gone off screen
            for char_info in column['chars']:
                if char_info['y'] > height + 50:
                    char_info['y'] = random.randint(-100, -char_height)
                    char_info['char'] = random.choice(self._create_digital_characters())
    
    def _create_scanlines(self, img: Image.Image) -> Image.Image:
        """Add CRT-style scanlines for retro effect"""
        data = np.array(img).astype(float)
        height, width = data.shape[:2]
        
        # Create scanline pattern
        for y in range(0, height, 2):
            if y < height:
                data[y, :] *= 0.9  # Slightly darken every other line
        
        return Image.fromarray(np.clip(data, 0, 255).astype(np.uint8))
    
    def _add_digital_glitches(self, img: Image.Image) -> Image.Image:
        """Add random digital glitches"""
        data = np.array(img)
        height, width = data.shape[:2]
        
        # Add random horizontal glitch lines
        num_glitches = random.randint(3, 8)
        
        for _ in range(num_glitches):
            y = random.randint(0, height - 1)
            glitch_width = random.randint(10, width // 3)
            start_x = random.randint(0, width - glitch_width)
            
            # Create glitch effect by shifting pixels
            shift = random.randint(-20, 20)
            
            for x in range(start_x, min(start_x + glitch_width, width)):
                src_x = np.clip(x + shift, 0, width - 1)
                data[y, x] = data[y, src_x]
                
                # Add color distortion
                if random.random() < 0.3:
                    data[y, x] = [0, random.randint(100, 255), 0]  # Green glitch
        
        return Image.fromarray(data)
    
    def _create_multiple_frames(self, img: Image.Image) -> Image.Image:
        """Create a composite of multiple rain frames for static effect"""
        # Create multiple frames and blend them
        columns = self._create_rain_columns(img.width, img.height)
        
        # Create base frame
        frame1 = self._render_rain_frame(img, columns)
        
        # Update and create second frame
        self._update_rain_columns(columns, img.height)
        frame2 = self._render_rain_frame(img, columns)
        
        # Update and create third frame
        self._update_rain_columns(columns, img.height)
        frame3 = self._render_rain_frame(img, columns)
        
        # Blend frames for motion blur effect
        data1 = np.array(frame1).astype(float)
        data2 = np.array(frame2).astype(float)
        data3 = np.array(frame3).astype(float)
        
        # Weighted blend
        blended = (data1 * 0.5 + data2 * 0.3 + data3 * 0.2)
        
        return Image.fromarray(np.clip(blended, 0, 255).astype(np.uint8))
    
    def process_image(self, input_path: Path, output_path: Path) -> None:
        original_img = Image.open(input_path).convert("RGB")
        
        # Darken image and add green tint
        darkened = self._darken_image(original_img)
        
        # Create digital rain effect
        rain_effect = self._create_multiple_frames(darkened)
        
        # Add scanlines for CRT effect
        scanlines = self._create_scanlines(rain_effect)
        
        # Add digital glitches
        glitched = self._add_digital_glitches(scanlines)
        
        # Enhance green channel for matrix effect
        enhancer = ImageEnhance.Color(glitched)
        enhanced = enhancer.enhance(1.3)
        
        # Save result
        result_monad = MonadImage(PngImage(enhanced))
        result_monad.bind(Save(output_path))