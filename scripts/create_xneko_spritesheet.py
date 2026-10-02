#!/usr/bin/env python3
"""
Xneko Spritesheet Generator - FIXED VERSION
Automatically detects non-empty cells and uses them for animations
"""

from PIL import Image
import sys
import os

# Oneko.js sprite layout (column, row) - 0-indexed
ONEKO_LAYOUT = {
    # Row 0
    "idle": [(3, 3)],
    "alert": [(7, 3)],
    "scratchSelf": [(5, 0), (6, 0), (7, 0)],
    "scratchWallN": [(0, 0), (0, 1)],
    "scratchWallS": [(7, 1), (6, 2)],
    "scratchWallE": [(2, 2), (2, 3)],
    "scratchWallW": [(4, 0), (4, 1)],
    "tired": [(3, 2)],
    "sleeping": [(2, 0), (2, 1)],
    
    # Movement animations
    "N": [(1, 2), (1, 3)],
    "NE": [(0, 2), (0, 3)],
    "E": [(3, 0), (3, 1)],
    "SE": [(5, 1), (5, 2)],
    "S": [(6, 3), (7, 2)],
    "SW": [(5, 3), (6, 1)],
    "W": [(4, 2), (4, 3)],
    "NW": [(1, 0), (1, 1)],
}

def is_cell_empty(img, grid_x, grid_y, cell_size=32, threshold=10):
    """Check if a cell is mostly empty/transparent"""
    x = grid_x * cell_size
    y = grid_y * cell_size
    cell = img.crop((x, y, x + cell_size, y + cell_size))
    
    # Check average alpha
    if cell.mode == "RGBA":
        alphas = [pixel[3] for pixel in cell.getdata()]
        avg_alpha = sum(alphas) / len(alphas)
        return avg_alpha < threshold
    
    # For RGB, check if mostly black/white
    pixels = list(cell.getdata())
    non_background = sum(1 for p in pixels if p != (0, 0, 0) and p != (255, 255, 255))
    return non_background < (cell_size * cell_size * 0.1)  # Less than 10% content

def find_non_empty_cells(img, cell_size=32, max_cells=100):
    """Find first N non-empty cells from source image"""
    width, height = img.size
    cols = width // cell_size
    rows = height // cell_size
    
    non_empty = []
    for row in range(rows):
        for col in range(cols):
            if not is_cell_empty(img, col, row, cell_size):
                non_empty.append((col, row))
                if len(non_empty) >= max_cells:
                    return non_empty
    
    return non_empty

def extract_cell(img, grid_x, grid_y, cell_size=32):
    """Extract a single 32x32 cell from sprite grid"""
    x = grid_x * cell_size
    y = grid_y * cell_size
    return img.crop((x, y, x + cell_size, y + cell_size))

def create_oneko_sheet_auto(input_path, output_path, cell_size=32):
    """
    Create oneko.js compatible spritesheet using auto-detected non-empty cells
    """
    print(f"Loading: {input_path}")
    source_img = Image.open(input_path).convert("RGBA")
    
    # Calculate source grid dimensions
    src_width, src_height = source_img.size
    src_cols = src_width // cell_size
    src_rows = src_height // cell_size
    
    print(f"Source grid: {src_cols} cols × {src_rows} rows ({src_cols * src_rows} cells)")
    
    # Find non-empty cells
    print("Scanning for non-empty cells...")
    non_empty_cells = find_non_empty_cells(source_img, cell_size, max_cells=50)
    print(f"Found {len(non_empty_cells)} non-empty cells")
    
    if len(non_empty_cells) < 10:
        print("⚠ Warning: Very few non-empty cells found. Check source image!")
    
    # Create output image (8 cols × 4 rows)
    output_img = Image.new("RGBA", (cell_size * 8, cell_size * 4), (0, 0, 0, 0))
    
    # Distribute non-empty cells across oneko layout
    cell_idx = 0
    total_frames = 0
    
    for anim_name, target_positions in ONEKO_LAYOUT.items():
        for target_pos in target_positions:
            target_col, target_row = target_pos
            
            # Get next non-empty cell (cycle if we run out)
            if non_empty_cells:
                source_col, source_row = non_empty_cells[cell_idx % len(non_empty_cells)]
                cell_idx += 1
                
                # Extract and paste
                cell = extract_cell(source_img, source_col, source_row, cell_size)
                target_x = target_col * cell_size
                target_y = target_row * cell_size
                output_img.paste(cell, (target_x, target_y))
                total_frames += 1
    
    # Save output
    output_img.save(output_path, "PNG", optimize=True)
    print(f"✓ Created: {output_path} ({total_frames} frames)")
    print(f"  Output: 8 cols × 4 rows = {cell_size * 8}×{cell_size * 4} pixels")

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    base_dir = os.path.dirname(script_dir)
    sprites_dir = os.path.join(base_dir, "src", "userplugins", "cursorBuddy", "sprites")
    
    input_towel = os.path.join(sprites_dir, "xneko-towel.jpg")
    input_bikini = os.path.join(sprites_dir, "xneko-bikini.png")
    
    output_towel = os.path.join(sprites_dir, "xneko-towel-oneko.png")
    output_bikini = os.path.join(sprites_dir, "xneko-bikini-oneko.png")
    
    if not os.path.exists(input_towel):
        print(f"❌ Error: {input_towel} not found!")
        return 1
    
    if not os.path.exists(input_bikini):
        print(f"❌ Error: {input_bikini} not found!")
        return 1
    
    print("=" * 60)
    print("XNEKO SPRITESHEET GENERATOR (AUTO MODE)")
    print("=" * 60)
    print()
    
    # Generate towel spritesheet
    print("[1/2] Processing Xneko Towel Girl...")
    create_oneko_sheet_auto(input_towel, output_towel)
    print()
    
    # Generate bikini spritesheet
    print("[2/2] Processing Xneko Bikini Girl...")
    create_oneko_sheet_auto(input_bikini, output_bikini)
    print()
    
    print("=" * 60)
    print("✓ DONE! Auto-generated oneko spritesheets!")
    print("=" * 60)
    print()
    print("Next steps:")
    print("1. Visually inspect the output PNGs")
    print("2. Rebuild DDT (pnpm build)")
    print("3. Inject and test in Discord!")
    
    return 0

if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n❌ Cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
