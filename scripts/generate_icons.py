#!/usr/bin/env python3
"""Generate app icons for apodixxi with receipt design."""

from PIL import Image, ImageDraw
import os

# Colors from the app theme
DARK_BG = (17, 24, 39)  # #111827 - Dark background
TEAL = (45, 212, 191)   # #2DD4BF - Primary teal color
WHITE = (255, 255, 255)

def create_receipt_icon(size, padding_ratio=0.15, corner_radius_ratio=0.2):
    """Create a receipt icon with the app's design."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    padding = int(size * padding_ratio)
    corner_radius = int(size * corner_radius_ratio)
    
    # Draw rounded rectangle background
    draw.rounded_rectangle(
        [0, 0, size - 1, size - 1],
        radius=corner_radius,
        fill=DARK_BG
    )
    
    # Receipt dimensions
    receipt_width = int(size * 0.55)
    receipt_height = int(size * 0.65)
    receipt_x = (size - receipt_width) // 2
    receipt_y = int(size * 0.12)
    
    # Receipt corner fold size
    fold_size = int(receipt_width * 0.25)
    
    # Draw receipt shape with folded corner
    receipt_points = [
        (receipt_x, receipt_y),  # Top left
        (receipt_x + receipt_width - fold_size, receipt_y),  # Top right before fold
        (receipt_x + receipt_width, receipt_y + fold_size),  # After fold
        (receipt_x + receipt_width, receipt_y + receipt_height),  # Bottom right
        (receipt_x, receipt_y + receipt_height),  # Bottom left
    ]
    draw.polygon(receipt_points, fill=TEAL)
    
    # Draw fold triangle (darker shade)
    fold_color = (35, 170, 153)  # Slightly darker teal
    fold_points = [
        (receipt_x + receipt_width - fold_size, receipt_y),
        (receipt_x + receipt_width, receipt_y + fold_size),
        (receipt_x + receipt_width - fold_size, receipt_y + fold_size),
    ]
    draw.polygon(fold_points, fill=fold_color)
    
    # Draw lines on receipt
    line_y_start = receipt_y + int(receipt_height * 0.25)
    line_height = int(size * 0.035)
    line_spacing = int(size * 0.12)
    line_margin = int(receipt_width * 0.15)
    
    # First line (longer)
    line1_width = int(receipt_width * 0.6)
    draw.rounded_rectangle(
        [receipt_x + line_margin, line_y_start,
         receipt_x + line_margin + line1_width, line_y_start + line_height],
        radius=line_height // 2,
        fill=DARK_BG
    )
    
    # Second line (shorter)
    line2_width = int(receipt_width * 0.4)
    line2_y = line_y_start + line_spacing
    draw.rounded_rectangle(
        [receipt_x + line_margin, line2_y,
         receipt_x + line_margin + line2_width, line2_y + line_height],
        radius=line_height // 2,
        fill=DARK_BG
    )
    
    # Draw curved bottom part (receipt tail)
    tail_height = int(size * 0.18)
    tail_y = receipt_y + receipt_height
    tail_width = receipt_width
    
    # Create tail with wave effect
    tail_points = [
        (receipt_x, tail_y),
        (receipt_x + receipt_width, tail_y),
        (receipt_x + receipt_width, tail_y + tail_height * 0.6),
    ]
    
    # Draw curved tail
    curve_segments = 5
    segment_width = tail_width / curve_segments
    wave_height = tail_height * 0.4
    
    for i in range(curve_segments, -1, -1):
        x = receipt_x + i * segment_width
        if i % 2 == 0:
            y = tail_y + tail_height
        else:
            y = tail_y + tail_height - wave_height
        tail_points.append((x, y))
    
    draw.polygon(tail_points, fill=TEAL)
    
    return img

def create_adaptive_icon(size):
    """Create adaptive icon (foreground only, transparent background)."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # For adaptive icons, we need more padding as the system crops
    padding = int(size * 0.2)
    inner_size = size - (padding * 2)
    
    # Receipt dimensions - centered
    receipt_width = int(inner_size * 0.55)
    receipt_height = int(inner_size * 0.65)
    receipt_x = padding + (inner_size - receipt_width) // 2
    receipt_y = padding + int(inner_size * 0.08)
    
    # Receipt corner fold size
    fold_size = int(receipt_width * 0.25)
    
    # Draw receipt shape with folded corner
    receipt_points = [
        (receipt_x, receipt_y),
        (receipt_x + receipt_width - fold_size, receipt_y),
        (receipt_x + receipt_width, receipt_y + fold_size),
        (receipt_x + receipt_width, receipt_y + receipt_height),
        (receipt_x, receipt_y + receipt_height),
    ]
    draw.polygon(receipt_points, fill=TEAL)
    
    # Draw fold triangle
    fold_color = (35, 170, 153)
    fold_points = [
        (receipt_x + receipt_width - fold_size, receipt_y),
        (receipt_x + receipt_width, receipt_y + fold_size),
        (receipt_x + receipt_width - fold_size, receipt_y + fold_size),
    ]
    draw.polygon(fold_points, fill=fold_color)
    
    # Draw lines on receipt
    line_y_start = receipt_y + int(receipt_height * 0.25)
    line_height = int(inner_size * 0.035)
    line_spacing = int(inner_size * 0.12)
    line_margin = int(receipt_width * 0.15)
    
    # First line
    line1_width = int(receipt_width * 0.6)
    draw.rounded_rectangle(
        [receipt_x + line_margin, line_y_start,
         receipt_x + line_margin + line1_width, line_y_start + line_height],
        radius=line_height // 2,
        fill=DARK_BG
    )
    
    # Second line
    line2_width = int(receipt_width * 0.4)
    line2_y = line_y_start + line_spacing
    draw.rounded_rectangle(
        [receipt_x + line_margin, line2_y,
         receipt_x + line_margin + line2_width, line2_y + line_height],
        radius=line_height // 2,
        fill=DARK_BG
    )
    
    # Draw tail
    tail_height = int(inner_size * 0.18)
    tail_y = receipt_y + receipt_height
    tail_width = receipt_width
    
    tail_points = [
        (receipt_x, tail_y),
        (receipt_x + receipt_width, tail_y),
        (receipt_x + receipt_width, tail_y + tail_height * 0.6),
    ]
    
    curve_segments = 5
    segment_width = tail_width / curve_segments
    wave_height = tail_height * 0.4
    
    for i in range(curve_segments, -1, -1):
        x = receipt_x + i * segment_width
        if i % 2 == 0:
            y = tail_y + tail_height
        else:
            y = tail_y + tail_height - wave_height
        tail_points.append((x, y))
    
    draw.polygon(tail_points, fill=TEAL)
    
    return img

def main():
    output_dir = '/app/frontend/assets/images'
    
    # Create main icon (1024x1024 for best quality)
    print("Creating icon.png (1024x1024)...")
    icon = create_receipt_icon(1024)
    icon.save(os.path.join(output_dir, 'icon.png'), 'PNG')
    
    # Create adaptive icon foreground (1024x1024)
    print("Creating adaptive-icon.png (1024x1024)...")
    adaptive = create_adaptive_icon(1024)
    adaptive.save(os.path.join(output_dir, 'adaptive-icon.png'), 'PNG')
    
    # Create splash icon (same as main icon)
    print("Creating splash-icon.png (1024x1024)...")
    icon.save(os.path.join(output_dir, 'splash-icon.png'), 'PNG')
    
    # Create favicon (smaller, 196x196)
    print("Creating favicon.png (196x196)...")
    favicon = create_receipt_icon(196)
    favicon.save(os.path.join(output_dir, 'favicon.png'), 'PNG')
    
    print("All icons created successfully!")

if __name__ == '__main__':
    main()
