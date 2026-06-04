"""
Generate procedural textures for 九龙城寨 (Kowloon Walled City) aesthetic.
Low-resolution (256x256) pixel-art style textures.
"""
import random
import math
from PIL import Image, ImageDraw, ImageFilter

OUTPUT_DIR = "public/textures"
SIZE = 256

def add_noise(img, amount=20):
    """Add random noise to image."""
    pixels = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b = pixels[x, y]
            noise = random.randint(-amount, amount)
            pixels[x, y] = (
                max(0, min(255, r + noise)),
                max(0, min(255, g + noise)),
                max(0, min(255, b + noise))
            )
    return img

def generate_concrete():
    """Concrete/cement texture - grey with cracks and stains."""
    img = Image.new('RGB', (SIZE, SIZE), (120, 115, 110))
    draw = ImageDraw.Draw(img)
    
    # Base grey variation
    for y in range(SIZE):
        for x in range(SIZE):
            base = 110 + random.randint(-15, 15)
            # Add subtle horizontal lines (formwork marks)
            if y % 32 < 2:
                base -= 10
            pixels = img.load()
            pixels[x, y] = (base, base - 2, base - 5)
    
    # Add cracks
    for _ in range(5):
        x1 = random.randint(0, SIZE)
        y1 = random.randint(0, SIZE)
        length = random.randint(20, 80)
        angle = random.uniform(0, math.pi * 2)
        x2 = x1 + int(math.cos(angle) * length)
        y2 = y1 + int(math.sin(angle) * length)
        draw.line([(x1, y1), (x2, y2)], fill=(80, 75, 70), width=1)
    
    # Add stains
    for _ in range(8):
        x = random.randint(0, SIZE)
        y = random.randint(0, SIZE)
        r = random.randint(5, 15)
        color = random.choice([(90, 85, 80), (100, 95, 90), (80, 75, 70)])
        draw.ellipse([x-r, y-r, x+r, y+r], fill=color)
    
    add_noise(img, 8)
    img.save(f"{OUTPUT_DIR}/concrete.jpg", quality=85)
    print("Generated concrete.jpg")

def generate_brick():
    """Brick wall texture - red/brown pattern."""
    img = Image.new('RGB', (SIZE, SIZE), (140, 60, 50))
    draw = ImageDraw.Draw(img)
    
    brick_w = 32
    brick_h = 16
    mortar_w = 2
    
    for row in range(SIZE // brick_h):
        offset = (brick_w // 2) if row % 2 else 0
        for col in range(-1, SIZE // brick_w + 1):
            x = col * brick_w + offset
            y = row * brick_h
            
            # Brick color variation
            r = random.randint(130, 160)
            g = random.randint(50, 70)
            b = random.randint(40, 55)
            draw.rectangle([x, y, x + brick_w - mortar_w, y + brick_h - mortar_w], 
                         fill=(r, g, b))
            
            # Add brick texture
            for _ in range(3):
                bx = x + random.randint(2, brick_w - 4)
                by = y + random.randint(2, brick_h - 4)
                draw.point((bx, by), fill=(r - 20, g - 10, b - 10))
    
    # Mortar lines (darker)
    for row in range(SIZE // brick_h + 1):
        draw.line([(0, row * brick_h), (SIZE, row * brick_h)], fill=(80, 75, 70), width=mortar_w)
    
    add_noise(img, 5)
    img.save(f"{OUTPUT_DIR}/brick.jpg", quality=85)
    print("Generated brick.jpg")

def generate_metal():
    """Metal/rust texture - grey with scratches and rust spots."""
    img = Image.new('RGB', (SIZE, SIZE), (100, 100, 105))
    draw = ImageDraw.Draw(img)
    
    # Metal base with vertical grain
    for y in range(SIZE):
        for x in range(SIZE):
            base = 100 + random.randint(-5, 5)
            # Vertical grain
            if x % 8 < 1:
                base += 5
            pixels = img.load()
            pixels[x, y] = (base, base, base + 3)
    
    # Rust spots
    for _ in range(12):
        x = random.randint(0, SIZE)
        y = random.randint(0, SIZE)
        r = random.randint(3, 12)
        color = random.choice([(150, 80, 40), (160, 90, 50), (140, 70, 35)])
        draw.ellipse([x-r, y-r, x+r, y+r], fill=color)
    
    # Scratches
    for _ in range(8):
        x1 = random.randint(0, SIZE)
        y1 = random.randint(0, SIZE)
        length = random.randint(10, 40)
        angle = random.uniform(0, math.pi)
        x2 = x1 + int(math.cos(angle) * length)
        y2 = y1 + int(math.sin(angle) * length)
        draw.line([(x1, y1), (x2, y2)], fill=(130, 130, 135), width=1)
    
    add_noise(img, 6)
    img.save(f"{OUTPUT_DIR}/metal.jpg", quality=85)
    print("Generated metal.jpg")

def generate_ground():
    """Ground texture - dirty cobblestone/concrete."""
    img = Image.new('RGB', (SIZE, SIZE), (90, 85, 80))
    draw = ImageDraw.Draw(img)
    
    # Cobblestone pattern
    stone_size = 24
    for row in range(SIZE // stone_size + 1):
        for col in range(SIZE // stone_size + 1):
            x = col * stone_size + random.randint(-2, 2)
            y = row * stone_size + random.randint(-2, 2)
            w = stone_size - 3 + random.randint(-2, 2)
            h = stone_size - 3 + random.randint(-2, 2)
            
            # Stone color variation
            base = 85 + random.randint(-10, 10)
            draw.rectangle([x, y, x + w, y + h], fill=(base, base - 3, base - 5))
            
            # Add cracks to some stones
            if random.random() < 0.2:
                cx = x + w // 2
                cy = y + h // 2
                draw.line([(cx, y), (cx, y + h)], fill=(60, 55, 50), width=1)
    
    # Dirt/grime
    for _ in range(20):
        x = random.randint(0, SIZE)
        y = random.randint(0, SIZE)
        r = random.randint(2, 8)
        draw.ellipse([x-r, y-r, x+r, y+r], fill=(70, 65, 60))
    
    add_noise(img, 10)
    img.save(f"{OUTPUT_DIR}/ground.jpg", quality=85)
    print("Generated ground.jpg")

def generate_wood():
    """Wood texture - old painted wood."""
    img = Image.new('RGB', (SIZE, SIZE), (120, 100, 70))
    draw = ImageDraw.Draw(img)
    
    # Wood grain (horizontal lines)
    for y in range(SIZE):
        base = 110 + int(math.sin(y * 0.3) * 15) + random.randint(-5, 5)
        for x in range(SIZE):
            # Grain variation
            grain = int(math.sin(x * 0.1 + y * 0.05) * 5)
            r = base + grain
            g = int(r * 0.8)
            b = int(r * 0.6)
            pixels = img.load()
            pixels[x, y] = (r, g, b)
    
    # Paint peeling (lighter patches)
    for _ in range(6):
        x = random.randint(0, SIZE)
        y = random.randint(0, SIZE)
        w = random.randint(10, 30)
        h = random.randint(15, 40)
        draw.rectangle([x, y, x + w, y + h], fill=(140, 120, 90))
    
    # Nail holes
    for _ in range(4):
        x = random.randint(10, SIZE - 10)
        y = random.randint(10, SIZE - 10)
        draw.ellipse([x-2, y-2, x+2, y+2], fill=(50, 45, 40))
    
    add_noise(img, 6)
    img.save(f"{OUTPUT_DIR}/wood.jpg", quality=85)
    print("Generated wood.jpg")

if __name__ == "__main__":
    import os
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    print("Generating Kowloon Walled City textures...")
    generate_concrete()
    generate_brick()
    generate_metal()
    generate_ground()
    generate_wood()
    print(f"\nDone! Textures saved to {OUTPUT_DIR}/")
    print("Each texture is 256x256 pixels, ~5-15KB each.")
