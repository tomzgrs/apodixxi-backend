#!/usr/bin/env python3
"""Generate high-quality app icon matching the app's design."""

from PIL import Image, ImageDraw
import math

# Colors matching the app
DARK_BG = (17, 24, 39)  # #111827
TEAL = (45, 212, 191)   # #2DD4BF
DARK_TEAL = (30, 160, 145)  # Slightly darker for fold

def draw_rounded_rectangle(draw, coords, radius, fill):
    """Draw a rounded rectangle."""
    x1, y1, x2, y2 = coords
    draw.rounded_rectangle(coords, radius=radius, fill=fill)

def create_app_icon(size=1024):
    """Create the app icon matching the screenshot design."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Background rounded rectangle
    corner_radius = int(size * 0.18)  # ~18% corner radius
    draw.rounded_rectangle(
        [0, 0, size - 1, size - 1],
        radius=corner_radius,
        fill=DARK_BG
    )
    
    # Receipt dimensions - positioned like in the app
    margin = int(size * 0.18)
    receipt_width = int(size * 0.64)
    receipt_height = int(size * 0.58)
    
    # Center the receipt
    receipt_x = (size - receipt_width) // 2
    receipt_y = int(size * 0.14)
    
    # Fold size
    fold_size = int(receipt_width * 0.22)
    
    # Main receipt body (with folded corner)
    receipt_points = [
        (receipt_x, receipt_y),  # Top left
        (receipt_x + receipt_width - fold_size, receipt_y),  # Top right before fold
        (receipt_x + receipt_width, receipt_y + fold_size),  # After fold
        (receipt_x + receipt_width, receipt_y + receipt_height),  # Bottom right
        (receipt_x, receipt_y + receipt_height),  # Bottom left
    ]
    draw.polygon(receipt_points, fill=TEAL)
    
    # Fold triangle (darker shade to show depth)
    fold_points = [
        (receipt_x + receipt_width - fold_size, receipt_y),
        (receipt_x + receipt_width, receipt_y + fold_size),
        (receipt_x + receipt_width - fold_size, receipt_y + fold_size),
    ]
    draw.polygon(fold_points, fill=DARK_TEAL)
    
    # Text lines on receipt
    line_margin_left = int(receipt_width * 0.14)
    line_height = int(size * 0.045)
    line_radius = line_height // 2
    
    # First line (longer) - positioned at ~35% of receipt height
    line1_y = receipt_y + int(receipt_height * 0.32)
    line1_width = int(receipt_width * 0.52)
    draw.rounded_rectangle(
        [receipt_x + line_margin_left, line1_y,
         receipt_x + line_margin_left + line1_width, line1_y + line_height],
        radius=line_radius,
        fill=DARK_BG
    )
    
    # Second line (shorter) - positioned below first
    line2_y = line1_y + int(size * 0.10)
    line2_width = int(receipt_width * 0.35)
    draw.rounded_rectangle(
        [receipt_x + line_margin_left, line2_y,
         receipt_x + line_margin_left + line2_width, line2_y + line_height],
        radius=line_radius,
        fill=DARK_BG
    )
    
    # Curved receipt tail/bottom part
    tail_start_y = receipt_y + receipt_height
    tail_height = int(size * 0.22)
    tail_curve_radius = int(size * 0.18)
    
    # Draw the curved tail - starts from receipt bottom left, curves down and right
    # Using a series of points to create a smooth curve
    
    # Left side going down
    tail_points = [
        (receipt_x, tail_start_y),  # Start at bottom left of receipt
    ]
    
    # Curve down on the left
    curve_steps = 20
    for i in range(curve_steps + 1):
        angle = math.pi / 2 * i / curve_steps  # 0 to 90 degrees
        x = receipt_x + tail_curve_radius - tail_curve_radius * math.cos(angle)
        y = tail_start_y + tail_curve_radius * math.sin(angle)
        tail_points.append((x, y))
    
    # Bottom horizontal part
    bottom_y = tail_start_y + tail_curve_radius
    right_curve_start_x = receipt_x + int(receipt_width * 0.55)
    tail_points.append((right_curve_start_x, bottom_y))
    
    # Curve up on the right (smaller curve)
    small_curve_radius = int(size * 0.12)
    for i in range(curve_steps, -1, -1):
        angle = math.pi / 2 * i / curve_steps
        x = right_curve_start_x + small_curve_radius * math.sin(angle)
        y = bottom_y - small_curve_radius + small_curve_radius * math.cos(angle)
        tail_points.append((x, y))
    
    # Back to the receipt
    tail_points.append((right_curve_start_x + small_curve_radius, tail_start_y))
    tail_points.append((receipt_x + receipt_width, tail_start_y))  # To right edge
    
    # Draw tail
    draw.polygon(tail_points, fill=TEAL)
    
    return img

def create_simple_icon(size=1024):
    """Create a simpler, cleaner version of the icon."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Background
    corner_radius = int(size * 0.18)
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=corner_radius, fill=DARK_BG)
    
    # Receipt positioning
    receipt_width = int(size * 0.55)
    receipt_height = int(size * 0.50)
    receipt_x = int(size * 0.22)
    receipt_y = int(size * 0.15)
    
    fold_size = int(receipt_width * 0.25)
    
    # Main receipt
    points = [
        (receipt_x, receipt_y),
        (receipt_x + receipt_width - fold_size, receipt_y),
        (receipt_x + receipt_width, receipt_y + fold_size),
        (receipt_x + receipt_width, receipt_y + receipt_height),
        (receipt_x, receipt_y + receipt_height),
    ]
    draw.polygon(points, fill=TEAL)
    
    # Fold
    fold_points = [
        (receipt_x + receipt_width - fold_size, receipt_y),
        (receipt_x + receipt_width, receipt_y + fold_size),
        (receipt_x + receipt_width - fold_size, receipt_y + fold_size),
    ]
    draw.polygon(fold_points, fill=DARK_TEAL)
    
    # Lines
    line_h = int(size * 0.04)
    line_margin = int(receipt_width * 0.15)
    
    line1_y = receipt_y + int(receipt_height * 0.35)
    draw.rounded_rectangle(
        [receipt_x + line_margin, line1_y, 
         receipt_x + line_margin + int(receipt_width * 0.55), line1_y + line_h],
        radius=line_h//2, fill=DARK_BG
    )
    
    line2_y = line1_y + int(size * 0.09)
    draw.rounded_rectangle(
        [receipt_x + line_margin, line2_y,
         receipt_x + line_margin + int(receipt_width * 0.35), line2_y + line_h],
        radius=line_h//2, fill=DARK_BG
    )
    
    # Curved tail
    tail_y = receipt_y + receipt_height
    tail_h = int(size * 0.20)
    curve_r = int(size * 0.15)
    
    # Simple curved tail using arc approximation
    tail_width = int(receipt_width * 0.6)
    
    # Draw as polygon with curve approximation
    tail_pts = [(receipt_x, tail_y)]
    
    # Left curve down
    steps = 15
    for i in range(steps + 1):
        t = i / steps
        angle = math.pi / 2 * t
        x = receipt_x + curve_r * (1 - math.cos(angle))
        y = tail_y + curve_r * math.sin(angle)
        tail_pts.append((x, y))
    
    # Bottom
    tail_pts.append((receipt_x + tail_width - curve_r * 0.5, tail_y + curve_r))
    
    # Right curve up (smaller)
    small_r = int(size * 0.10)
    curve_end_x = receipt_x + tail_width
    for i in range(steps, -1, -1):
        t = i / steps
        angle = math.pi / 2 * t
        x = curve_end_x - small_r + small_r * math.sin(angle)
        y = tail_y + small_r * math.cos(angle)
        tail_pts.append((x, y))
    
    tail_pts.append((curve_end_x, tail_y))
    
    draw.polygon(tail_pts, fill=TEAL)
    
    return img

# Generate icons
print("Creating high-quality icon...")
icon = create_simple_icon(1024)
icon.save('/app/frontend/assets/images/icon.png', 'PNG')
icon.save('/app/backend/icon.png', 'PNG')
print("Saved icon.png (1024x1024)")

# Also create adaptive icon
print("Creating adaptive icon...")
adaptive = create_simple_icon(1024)
adaptive.save('/app/frontend/assets/images/adaptive-icon.png', 'PNG')
print("Saved adaptive-icon.png")

# Splash icon
icon.save('/app/frontend/assets/images/splash-icon.png', 'PNG')
print("Saved splash-icon.png")

# Favicon
favicon = create_simple_icon(512)
favicon.save('/app/frontend/assets/images/favicon.png', 'PNG')
print("Saved favicon.png")

print("\n✅ All icons generated successfully!")
