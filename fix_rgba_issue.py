#!/usr/bin/env python3
"""
Script to fix the RGBA->JPEG conversion issue in the Image Resizer API
Uses the Supabase client to directly apply the fix
"""

import os
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))

# API details
API_ID = "cca6f50b-d1b6-497d-bdca-e501c8004987"

# Error information for the AI
ERROR_LOGS = """ERROR: Image processing error: cannot write mode RGBA as JPEG

Traceback:
  File "main.py", line XX, in resize_image
    image.save(buffer, format='JPEG')
  ...
ValueError: cannot write mode RGBA as JPEG

ROOT CAUSE: PNG images with transparency (RGBA mode) cannot be saved as JPEG format because JPEG does not support alpha channels.

REQUIRED FIX:
1. Before saving as JPEG, check if the image is in RGBA mode
2. If RGBA, convert to RGB mode: image = image.convert('RGB')
3. Add better error handling with descriptive messages

Example fix:
    # After processing the image, before saving
    if image.mode == 'RGBA':
        image = image.convert('RGB')

    buffer = BytesIO()
    image.save(buffer, format='JPEG')
"""

def get_fix_instructions():
    """Generate detailed fix instructions for the troubleshoot API"""
    return f"""
The Image Resizer API is failing with the error:
"Image processing error: cannot write mode RGBA as JPEG"

ROOT CAUSE:
The API is trying to save PNG images with transparency (RGBA mode) as JPEG.
JPEG format does not support alpha channels, causing the save operation to fail.

REQUIRED CODE CHANGES:

1. After resizing the image and BEFORE saving to buffer, add RGBA->RGB conversion:

   # Convert RGBA to RGB if necessary (JPEG doesn't support transparency)
   if image.mode == 'RGBA':
       image = image.convert('RGB')
   elif image.mode not in ('RGB', 'L'):
       image = image.convert('RGB')

2. Improve error handling in the resize endpoint with try-except blocks:

   try:
       image_bytes = base64.b64decode(image_data)
   except Exception as e:
       raise HTTPException(status_code=400, detail=f"Invalid base64 data: {{str(e)}}")

   try:
       image = Image.open(BytesIO(image_bytes))
   except Exception as e:
       raise HTTPException(status_code=400, detail=f"Invalid image file: {{str(e)}}")

3. The complete fixed resize logic should be:

   # Decode base64
   try:
       image_bytes = base64.b64decode(image_data)
   except Exception as e:
       raise HTTPException(status_code=400, detail=f"Invalid base64 data: {{str(e)}}")

   # Open image
   try:
       image = Image.open(BytesIO(image_bytes))
   except Exception as e:
       raise HTTPException(status_code=400, detail=f"Invalid image file: {{str(e)}}")

   original_width, original_height = image.size

   # Resize image
   image = image.resize((request.width, request.height), Image.LANCZOS)

   # Convert RGBA to RGB for JPEG compatibility
   if image.mode == 'RGBA':
       image = image.convert('RGB')
   elif image.mode not in ('RGB', 'L'):
       image = image.convert('RGB')

   # Save to buffer
   buffer = BytesIO()
   image.save(buffer, format='JPEG')
   image_data = buffer.getvalue()

Please apply these fixes to the code.
"""

def main():
    print("=" * 70)
    print("  RGBA->JPEG Conversion Fix for Image Resizer API")
    print("=" * 70)
    print(f"\nAPI ID: {API_ID}")
    print(f"Error: 'cannot write mode RGBA as JPEG'\n")

    print("SOLUTION 1: Use the API Playground (Recommended)")
    print("-" * 70)
    print("""
1. Go to your API Playground for the Image Resizer API
2. You should see a yellow warning card at the top saying "Container Error Detected"
3. Click the "Auto-Fix with AI" button
4. Wait for the AI to analyze, fix, and redeploy (takes ~30 seconds)
5. Test with a PNG image

This is the easiest and safest method!
""")

    print("\nSOLUTION 2: Manual Fix Instructions")
    print("-" * 70)
    print("""
If you need to manually apply the fix, here's what needs to change:

The issue is in the /resize endpoint. Before this line:
    image.save(buffer, format='JPEG')

Add this code:
    # Convert RGBA to RGB (JPEG doesn't support transparency)
    if image.mode == 'RGBA':
        image = image.convert('RGB')
    elif image.mode not in ('RGB', 'L'):
        image = image.convert('RGB')

This converts images with transparency to RGB mode before saving as JPEG.
""")

    print("\nSOLUTION 3: Copy Instructions for Troubleshoot API")
    print("-" * 70)
    print("""
Copy the following text and paste it into the Manual Troubleshoot section
of your API Playground, then click "Fix with AI":
""")
    print("\n--- START COPY HERE ---")
    print(get_fix_instructions().strip())
    print("--- END COPY HERE ---\n")

    print("\nWHY THIS FIX WORKS:")
    print("-" * 70)
    print("""
- PNG images often have an alpha channel (transparency) = RGBA mode
- JPEG format does NOT support transparency = only RGB mode
- Converting RGBA → RGB removes the alpha channel
- The image can then be saved as JPEG successfully
- The conversion is lossless for the visible RGB channels
""")

    print("\n" + "=" * 70)
    print("  Choose one of the solutions above to fix your API")
    print("=" * 70)

if __name__ == "__main__":
    main()
