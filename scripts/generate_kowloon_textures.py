"""
城寨纹理生成器

生成更多城寨专用的纹理：
- cardboard: 纸箱纹理（瓦楞纸板）
- street: 街道纹理（坑洼柏油路）
- wall: 墙面纹理（斑驳墙皮）
- rusty_metal: 生锈铁皮纹理
- tile: 瓷砖纹理（地砖/墙砖）
- fabric: 布料纹理（篷布/窗帘）
"""
from PIL import Image, ImageDraw, ImageFilter
import random
import os

# 输出目录
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'textures')

def ensure_output_dir():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

def generate_cardboard(size=256):
    """纸箱纹理：瓦楞纸板"""
    img = Image.new('RGB', (size, size), (180, 150, 100))
    draw = ImageDraw.Draw(img)
    
    # 瓦楞波纹
    for y in range(0, size, 8):
        offset = random.randint(-2, 2)
        color = random.randint(160, 200), random.randint(130, 170), random.randint(80, 120)
        draw.line([(0, y), (size, y)], fill=color, width=3)
    
    # 随机污渍
    for _ in range(20):
        x, y = random.randint(0, size), random.randint(0, size)
        r = random.randint(5, 15)
        color = random.randint(100, 140), random.randint(80, 120), random.randint(50, 80)
        draw.ellipse([x-r, y-r, x+r, y+r], fill=color)
    
    # 折痕
    for _ in range(3):
        x = random.randint(0, size)
        draw.line([(x, 0), (x, size)], fill=(140, 110, 70), width=2)
    
    return img.filter(ImageFilter.GaussianBlur(1))

def generate_street(size=256):
    """街道纹理：坑洼柏油路"""
    img = Image.new('RGB', (size, size), (60, 60, 60))
    draw = ImageDraw.Draw(img)
    
    # 柏油颗粒
    for _ in range(5000):
        x, y = random.randint(0, size-1), random.randint(0, size-1)
        gray = random.randint(40, 80)
        draw.point((x, y), fill=(gray, gray, gray))
    
    # 坑洼
    for _ in range(8):
        x, y = random.randint(0, size), random.randint(0, size)
        r = random.randint(10, 30)
        color = random.randint(30, 50), random.randint(30, 50), random.randint(30, 50)
        draw.ellipse([x-r, y-r, x+r, y+r], fill=color)
    
    # 裂缝
    for _ in range(5):
        x1, y1 = random.randint(0, size), random.randint(0, size)
        x2, y2 = x1 + random.randint(-50, 50), y1 + random.randint(-50, 50)
        draw.line([(x1, y1), (x2, y2)], fill=(30, 30, 30), width=2)
    
    # 积水
    for _ in range(3):
        x, y = random.randint(0, size), random.randint(0, size)
        r = random.randint(15, 40)
        color = random.randint(50, 70), random.randint(50, 70), random.randint(60, 80)
        draw.ellipse([x-r, y-r, x+r, y+r], fill=color)
    
    return img.filter(ImageFilter.GaussianBlur(1))

def generate_wall(size=256):
    """墙面纹理：斑驳墙皮"""
    img = Image.new('RGB', (size, size), (180, 170, 150))
    draw = ImageDraw.Draw(img)
    
    # 墙皮脱落
    for _ in range(30):
        x, y = random.randint(0, size), random.randint(0, size)
        w, h = random.randint(10, 40), random.randint(10, 40)
        color = random.randint(120, 160), random.randint(110, 150), random.randint(90, 130)
        draw.rectangle([x, y, x+w, y+h], fill=color)
    
    # 污渍
    for _ in range(20):
        x, y = random.randint(0, size), random.randint(0, size)
        r = random.randint(10, 30)
        color = random.randint(100, 140), random.randint(90, 130), random.randint(70, 110)
        draw.ellipse([x-r, y-r, x+r, y+r], fill=color)
    
    # 水痕
    for _ in range(10):
        x = random.randint(0, size)
        y1 = random.randint(0, size//2)
        y2 = y1 + random.randint(50, 150)
        draw.line([(x, y1), (x + random.randint(-10, 10), y2)], 
                  fill=(140, 130, 110), width=3)
    
    # 霉斑
    for _ in range(15):
        x, y = random.randint(0, size), random.randint(0, size)
        r = random.randint(5, 20)
        color = random.randint(80, 110), random.randint(90, 120), random.randint(60, 90)
        draw.ellipse([x-r, y-r, x+r, y+r], fill=color)
    
    return img.filter(ImageFilter.GaussianBlur(2))

def generate_rusty_metal(size=256):
    """生锈铁皮纹理"""
    img = Image.new('RGB', (size, size), (120, 80, 50))
    draw = ImageDraw.Draw(img)
    
    # 锈迹
    for _ in range(100):
        x, y = random.randint(0, size), random.randint(0, size)
        r = random.randint(3, 15)
        r_color = random.randint(130, 180)
        g_color = random.randint(60, 100)
        b_color = random.randint(20, 50)
        draw.ellipse([x-r, y-r, x+r, y+r], fill=(r_color, g_color, b_color))
    
    # 刮痕
    for _ in range(20):
        x1, y1 = random.randint(0, size), random.randint(0, size)
        x2, y2 = x1 + random.randint(-30, 30), y1 + random.randint(-30, 30)
        draw.line([(x1, y1), (x2, y2)], fill=(100, 70, 40), width=2)
    
    # 凸起
    for _ in range(15):
        x, y = random.randint(0, size), random.randint(0, size)
        r = random.randint(5, 20)
        draw.ellipse([x-r, y-r, x+r, y+r], fill=(150, 100, 60))
    
    # 铆钉
    for _ in range(8):
        x, y = random.randint(10, size-10), random.randint(10, size-10)
        r = 4
        draw.ellipse([x-r, y-r, x+r, y+r], fill=(80, 80, 80))
        draw.ellipse([x-2, y-2, x+2, y+2], fill=(100, 100, 100))
    
    return img.filter(ImageFilter.GaussianBlur(1))

def generate_tile(size=256):
    """瓷砖纹理：地砖/墙砖"""
    img = Image.new('RGB', (size, size), (200, 200, 190))
    draw = ImageDraw.Draw(img)
    
    tile_size = 32
    for y in range(0, size, tile_size):
        for x in range(0, size, tile_size):
            # 瓷砖颜色变化
            base = random.randint(180, 220)
            color = base, base - 10, base - 20
            draw.rectangle([x+1, y+1, x+tile_size-1, y+tile_size-1], fill=color)
            
            # 瓷砖纹理
            for _ in range(5):
                px, py = x + random.randint(2, tile_size-2), y + random.randint(2, tile_size-2)
                draw.point((px, py), fill=(base-30, base-30, base-30))
    
    # 缝隙
    for y in range(0, size, tile_size):
        draw.line([(0, y), (size, y)], fill=(150, 150, 140), width=2)
    for x in range(0, size, tile_size):
        draw.line([(x, 0), (x, size)], fill=(150, 150, 140), width=2)
    
    # 污渍
    for _ in range(10):
        x, y = random.randint(0, size), random.randint(0, size)
        r = random.randint(5, 15)
        draw.ellipse([x-r, y-r, x+r, y+r], fill=(160, 150, 140))
    
    return img.filter(ImageFilter.GaussianBlur(1))

def generate_fabric(size=256):
    """布料纹理：篷布/窗帘"""
    img = Image.new('RGB', (size, size), (80, 80, 80))
    draw = ImageDraw.Draw(img)
    
    # 布纹
    for y in range(0, size, 2):
        for x in range(0, size, 2):
            if (x + y) % 4 == 0:
                gray = random.randint(70, 90)
                draw.point((x, y), fill=(gray, gray, gray))
    
    # 褶皱
    for _ in range(10):
        x1, y1 = random.randint(0, size), random.randint(0, size)
        x2, y2 = x1 + random.randint(-60, 60), y1 + random.randint(-60, 60)
        draw.line([(x1, y1), (x2, y2)], fill=(60, 60, 60), width=3)
    
    # 污渍
    for _ in range(15):
        x, y = random.randint(0, size), random.randint(0, size)
        r = random.randint(5, 20)
        gray = random.randint(50, 70)
        draw.ellipse([x-r, y-r, x+r, y+r], fill=(gray, gray, gray))
    
    return img.filter(ImageFilter.GaussianBlur(1))

def generate_concrete_dirty(size=256):
    """脏混凝土纹理：更脏更旧"""
    img = Image.new('RGB', (size, size), (140, 140, 130))
    draw = ImageDraw.Draw(img)
    
    # 混凝土颗粒
    for _ in range(3000):
        x, y = random.randint(0, size-1), random.randint(0, size-1)
        gray = random.randint(120, 160)
        draw.point((x, y), fill=(gray, gray, gray-10))
    
    # 裂缝
    for _ in range(8):
        x1, y1 = random.randint(0, size), random.randint(0, size)
        x2, y2 = x1 + random.randint(-40, 40), y1 + random.randint(-40, 40)
        draw.line([(x1, y1), (x2, y2)], fill=(80, 80, 70), width=2)
    
    # 水渍
    for _ in range(12):
        x, y = random.randint(0, size), random.randint(0, size)
        r = random.randint(10, 30)
        color = random.randint(100, 120), random.randint(100, 120), random.randint(90, 110)
        draw.ellipse([x-r, y-r, x+r, y+r], fill=color)
    
    # 油渍
    for _ in range(6):
        x, y = random.randint(0, size), random.randint(0, size)
        r = random.randint(15, 35)
        color = random.randint(60, 80), random.randint(60, 80), random.randint(50, 70)
        draw.ellipse([x-r, y-r, x+r, y+r], fill=color)
    
    return img.filter(ImageFilter.GaussianBlur(1))

def generate_brick_old(size=256):
    """旧砖墙纹理：更破旧"""
    img = Image.new('RGB', (size, size), (160, 100, 80))
    draw = ImageDraw.Draw(img)
    
    # 砖块
    brick_w, brick_h = 40, 20
    for y in range(0, size, brick_h):
        offset = brick_w // 2 if (y // brick_h) % 2 else 0
        for x in range(-brick_w, size + brick_w, brick_w):
            bx = x + offset
            # 砖块颜色变化
            r = random.randint(140, 180)
            g = random.randint(80, 110)
            b = random.randint(60, 90)
            draw.rectangle([bx+1, y+1, bx+brick_w-1, y+brick_h-1], fill=(r, g, b))
            
            # 砖块纹理
            for _ in range(3):
                px, py = bx + random.randint(2, brick_w-2), y + random.randint(2, brick_h-2)
                draw.point((px, py), fill=(r-30, g-20, b-20))
    
    # 灰缝
    for y in range(0, size, brick_h):
        draw.line([(0, y), (size, y)], fill=(120, 120, 110), width=2)
    for y in range(0, size, brick_h):
        offset = brick_w // 2 if (y // brick_h) % 2 else 0
        for x in range(0, size + brick_w, brick_w):
            bx = x + offset
            draw.line([(bx, y), (bx, y+brick_h)], fill=(120, 120, 110), width=2)
    
    # 破损
    for _ in range(15):
        x, y = random.randint(0, size), random.randint(0, size)
        r = random.randint(5, 15)
        draw.ellipse([x-r, y-r, x+r, y+r], fill=(100, 70, 50))
    
    return img.filter(ImageFilter.GaussianBlur(1))

def generate_wood_old(size=256):
    """旧木板纹理：更破旧"""
    img = Image.new('RGB', (size, size), (120, 90, 60))
    draw = ImageDraw.Draw(img)
    
    # 木纹
    for y in range(0, size):
        base = random.randint(100, 140)
        for x in range(0, size):
            noise = random.randint(-10, 10)
            r = base + noise
            g = int(base * 0.75) + noise
            b = int(base * 0.5) + noise
            draw.point((x, y), fill=(r, g, b))
    
    # 木板接缝
    for x in range(0, size, 60):
        draw.line([(x, 0), (x, size)], fill=(80, 60, 40), width=3)
    
    # 钉子
    for _ in range(10):
        x, y = random.randint(10, size-10), random.randint(10, size-10)
        r = 3
        draw.ellipse([x-r, y-r, x+r, y+r], fill=(60, 60, 60))
    
    # 裂缝
    for _ in range(8):
        x1, y1 = random.randint(0, size), random.randint(0, size)
        x2, y2 = x1 + random.randint(-30, 30), y1 + random.randint(-30, 30)
        draw.line([(x1, y1), (x2, y2)], fill=(60, 40, 20), width=1)
    
    return img.filter(ImageFilter.GaussianBlur(1))

def main():
    ensure_output_dir()
    
    textures = {
        'cardboard': generate_cardboard,
        'street': generate_street,
        'wall': generate_wall,
        'rusty_metal': generate_rusty_metal,
        'tile': generate_tile,
        'fabric': generate_fabric,
        'concrete_dirty': generate_concrete_dirty,
        'brick_old': generate_brick_old,
        'wood_old': generate_wood_old,
    }
    
    for name, generator in textures.items():
        print(f"Generating {name}...")
        img = generator(256)
        path = os.path.join(OUTPUT_DIR, f'{name}.jpg')
        img.save(path, 'JPEG', quality=85)
        print(f"  Saved to {path}")
    
    print(f"\nGenerated {len(textures)} textures!")

if __name__ == '__main__':
    main()
