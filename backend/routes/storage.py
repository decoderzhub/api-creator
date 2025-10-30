"""
Storage Routes
Handles file uploads and processing with MinIO storage
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from pydantic import BaseModel
from PIL import Image
from io import BytesIO
import sys
import os
from typing import Optional
import uuid

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from storage import storage_service
from routes.auth import verify_token
from logger import logger

router = APIRouter()


class UploadResponse(BaseModel):
    success: bool
    url: str
    filename: str
    size: int
    content_type: str


class ResizeResponse(BaseModel):
    success: bool
    url: str
    original_size: dict
    resized_size: dict
    filename: str


@router.post("/upload", response_model=UploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    bucket: str = Form(default="uploads"),
    user_id: str = Depends(verify_token)
):
    """
    Upload a file to MinIO storage

    Args:
        file: The file to upload
        bucket: Target bucket name (default: uploads)

    Returns:
        UploadResponse with public URL
    """
    try:
        file_bytes = await file.read()

        filename = f"{uuid.uuid4()}_{file.filename}"

        public_url = storage_service.upload(
            bucket=bucket,
            filename=filename,
            data=file_bytes,
            content_type=file.content_type or "application/octet-stream"
        )

        logger.info(f"File uploaded by user {user_id}: {public_url}")

        return UploadResponse(
            success=True,
            url=public_url,
            filename=filename,
            size=len(file_bytes),
            content_type=file.content_type or "application/octet-stream"
        )

    except Exception as e:
        logger.error(f"Error uploading file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.post("/resize", response_model=ResizeResponse)
async def resize_image(
    file: UploadFile = File(...),
    width: int = Form(...),
    height: int = Form(...),
    bucket: str = Form(default="images"),
    user_id: str = Depends(verify_token)
):
    """
    Resize an image and upload to MinIO storage

    Args:
        file: The image file to resize
        width: Target width in pixels
        height: Target height in pixels
        bucket: Target bucket name (default: images)

    Returns:
        ResizeResponse with original and resized dimensions
    """
    try:
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")

        if width <= 0 or height <= 0:
            raise HTTPException(status_code=400, detail="Width and height must be positive")

        if width > 4096 or height > 4096:
            raise HTTPException(status_code=400, detail="Maximum dimension is 4096px")

        file_bytes = await file.read()

        image = Image.open(BytesIO(file_bytes))
        original_size = {"width": image.width, "height": image.height}

        logger.info(f"Resizing image from {original_size} to {width}x{height}")

        resized_image = image.resize((width, height), Image.Resampling.LANCZOS)

        output_buffer = BytesIO()
        image_format = image.format or "PNG"
        resized_image.save(output_buffer, format=image_format, quality=95)
        output_bytes = output_buffer.getvalue()

        base_filename = os.path.splitext(file.filename)[0]
        extension = os.path.splitext(file.filename)[1] or ".png"
        filename = f"{uuid.uuid4()}_{base_filename}_{width}x{height}{extension}"

        public_url = storage_service.upload(
            bucket=bucket,
            filename=filename,
            data=output_bytes,
            content_type=file.content_type
        )

        logger.info(f"Image resized and uploaded by user {user_id}: {public_url}")

        return ResizeResponse(
            success=True,
            url=public_url,
            original_size=original_size,
            resized_size={"width": width, "height": height},
            filename=filename
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resizing image: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Resize failed: {str(e)}")


@router.post("/thumbnail")
async def create_thumbnail(
    file: UploadFile = File(...),
    size: int = Form(default=200),
    bucket: str = Form(default="thumbnails"),
    user_id: str = Depends(verify_token)
):
    """
    Create a square thumbnail of an image

    Args:
        file: The image file
        size: Thumbnail size (default: 200px)
        bucket: Target bucket name (default: thumbnails)

    Returns:
        Public URL to the thumbnail
    """
    try:
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")

        if size <= 0 or size > 1024:
            raise HTTPException(status_code=400, detail="Size must be between 1 and 1024")

        file_bytes = await file.read()
        image = Image.open(BytesIO(file_bytes))

        image.thumbnail((size, size), Image.Resampling.LANCZOS)

        output_buffer = BytesIO()
        image_format = image.format or "PNG"
        image.save(output_buffer, format=image_format, quality=90)
        output_bytes = output_buffer.getvalue()

        base_filename = os.path.splitext(file.filename)[0]
        extension = os.path.splitext(file.filename)[1] or ".png"
        filename = f"{uuid.uuid4()}_{base_filename}_thumb_{size}{extension}"

        public_url = storage_service.upload(
            bucket=bucket,
            filename=filename,
            data=output_bytes,
            content_type=file.content_type
        )

        logger.info(f"Thumbnail created by user {user_id}: {public_url}")

        return {
            "success": True,
            "url": public_url,
            "size": size,
            "filename": filename
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating thumbnail: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Thumbnail creation failed: {str(e)}")


@router.post("/convert")
async def convert_image_format(
    file: UploadFile = File(...),
    format: str = Form(...),
    bucket: str = Form(default="images"),
    user_id: str = Depends(verify_token)
):
    """
    Convert an image to a different format

    Args:
        file: The image file
        format: Target format (png, jpg, webp, etc.)
        bucket: Target bucket name (default: images)

    Returns:
        Public URL to the converted image
    """
    try:
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")

        format = format.upper()
        allowed_formats = ["PNG", "JPEG", "JPG", "WEBP", "GIF", "BMP"]

        if format not in allowed_formats:
            raise HTTPException(
                status_code=400,
                detail=f"Format must be one of: {', '.join(allowed_formats)}"
            )

        file_bytes = await file.read()
        image = Image.open(BytesIO(file_bytes))

        if image.mode in ("RGBA", "LA") and format in ["JPEG", "JPG"]:
            background = Image.new("RGB", image.size, (255, 255, 255))
            background.paste(image, mask=image.split()[-1])
            image = background

        output_buffer = BytesIO()
        save_format = "JPEG" if format == "JPG" else format
        image.save(output_buffer, format=save_format, quality=95)
        output_bytes = output_buffer.getvalue()

        base_filename = os.path.splitext(file.filename)[0]
        extension = f".{format.lower()}"
        filename = f"{uuid.uuid4()}_{base_filename}{extension}"

        content_type_map = {
            "PNG": "image/png",
            "JPEG": "image/jpeg",
            "JPG": "image/jpeg",
            "WEBP": "image/webp",
            "GIF": "image/gif",
            "BMP": "image/bmp"
        }

        public_url = storage_service.upload(
            bucket=bucket,
            filename=filename,
            data=output_bytes,
            content_type=content_type_map.get(format, "application/octet-stream")
        )

        logger.info(f"Image converted to {format} by user {user_id}: {public_url}")

        return {
            "success": True,
            "url": public_url,
            "format": format.lower(),
            "filename": filename
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error converting image: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}")


@router.delete("/delete")
async def delete_file(
    bucket: str = Form(...),
    filename: str = Form(...),
    user_id: str = Depends(verify_token)
):
    """
    Delete a file from storage

    Args:
        bucket: Bucket name
        filename: File name to delete

    Returns:
        Success status
    """
    try:
        success = storage_service.delete(bucket, filename)

        if success:
            logger.info(f"File deleted by user {user_id}: {bucket}/{filename}")
            return {"success": True, "message": "File deleted"}
        else:
            raise HTTPException(status_code=404, detail="File not found")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")
