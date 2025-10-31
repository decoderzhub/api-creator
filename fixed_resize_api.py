from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from PIL import Image
from io import BytesIO
import base64

app = FastAPI(title="Advanced Image Resizer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ResizeRequest(BaseModel):
    image_data: str = Field(..., description="Base64 encoded image data")
    width: int = Field(..., gt=0, le=4000, description="Target width in pixels")
    height: int = Field(..., gt=0, le=4000, description="Target height in pixels")
    preserve_aspect_ratio: bool = Field(False, description="Preserve original aspect ratio")
    compression_level: int = Field(75, ge=1, le=100, description="JPEG compression quality")

class ResizeResponse(BaseModel):
    status: str
    original_width: int
    original_height: int
    new_width: int
    new_height: int
    resized_image: str
    file_size_bytes: int

@app.post("/resize", response_model=ResizeResponse)
async def resize_image(request: ResizeRequest):
    """
    Resize an image to specified dimensions with optional aspect ratio preservation.

    Parameters:
    - image_data: Base64 encoded image (with or without data URI prefix)
    - width: Target width in pixels
    - height: Target height in pixels
    - preserve_aspect_ratio: If True, maintains aspect ratio using thumbnail
    - compression_level: JPEG quality (1-100)

    Returns:
    - Original dimensions
    - New dimensions
    - Base64 encoded resized image
    - File size in bytes
    """
    try:
        # Strip data URI prefix if present
        image_data = request.image_data
        if ',' in image_data and image_data.startswith('data:'):
            image_data = image_data.split(',', 1)[1]

        # Decode base64
        try:
            image_bytes = base64.b64decode(image_data)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid base64 data: {str(e)}")

        # Open image
        try:
            image = Image.open(BytesIO(image_bytes))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid image file: {str(e)}")

        # Store original dimensions
        original_width, original_height = image.size

        # Resize image
        if request.preserve_aspect_ratio:
            image.thumbnail((request.width, request.height), Image.LANCZOS)
        else:
            image = image.resize((request.width, request.height), Image.LANCZOS)

        # Get new dimensions (might differ from requested if aspect ratio preserved)
        new_width, new_height = image.size

        # Convert RGBA to RGB for JPEG compatibility
        output_format = "JPEG"
        if image.mode == 'RGBA':
            # Create white background
            background = Image.new('RGB', image.size, (255, 255, 255))
            background.paste(image, mask=image.split()[3] if len(image.split()) == 4 else None)
            image = background
        elif image.mode not in ('RGB', 'L'):
            image = image.convert('RGB')

        # Save to buffer
        buffer = BytesIO()
        image.save(buffer, format=output_format, quality=request.compression_level, optimize=True)
        image_data = buffer.getvalue()

        # Convert to base64
        resized_base64 = base64.b64encode(image_data).decode('utf-8')

        return ResizeResponse(
            status="success",
            original_width=original_width,
            original_height=original_height,
            new_width=new_width,
            new_height=new_height,
            resized_image=f"data:image/jpeg;base64,{resized_base64}",
            file_size_bytes=len(image_data)
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image processing error: {str(e)}")

@app.get("/")
async def root():
    return {
        "message": "Advanced Image Resizer API",
        "endpoints": {
            "/resize": "POST - Resize images with aspect ratio preservation",
            "/docs": "Interactive API documentation"
        }
    }
