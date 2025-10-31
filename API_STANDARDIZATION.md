# API Generation Standardization

## Problem Statement

Currently, there are three separate AI generation steps with no coordination:
1. **API Code Generation** - Creates FastAPI endpoints
2. **Test UI Generation** - Creates React test components
3. **Gateway Proxy** - Forwards requests between them

This causes mismatches where:
- API expects multipart/form-data but UI sends JSON
- UI sends multipart but gateway corrupts it
- Types don't match (string vs int, boolean vs string)

## Solution: Standardized Request Patterns

### Pattern 1: JSON-Only APIs (RECOMMENDED)

**When to use:** All APIs except those requiring large file uploads

**API Code:**
```python
from pydantic import BaseModel

class ImageResizeRequest(BaseModel):
    image_data: str  # base64-encoded image
    width: int
    height: int
    preserve_aspect_ratio: bool = True
    compression_quality: int = 85

@app.post("/resize")
async def resize_image(request: ImageResizeRequest):
    # Decode base64
    import base64
    image_bytes = base64.b64decode(request.image_data)
    # ... process image
```

**Test UI Code:**
```javascript
// Convert file to base64
const reader = new FileReader();
reader.onloadend = async () => {
  const base64 = reader.result.split(',')[1]; // Remove data:image/...;base64,

  const response = await fetch(`${apiUrl}/resize`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      image_data: base64,
      width: width,
      height: height,
      preserve_aspect_ratio: preserveAspectRatio,
      compression_quality: compressionQuality
    })
  });
};
reader.readAsDataURL(file);
```

**Benefits:**
- ✅ No multipart complexity
- ✅ Gateway forwards JSON perfectly
- ✅ Type safety with Pydantic
- ✅ Easy debugging (can see full request)
- ✅ Works everywhere

**Drawbacks:**
- ❌ Base64 encoding increases size by ~33%
- ❌ Not ideal for very large files (>10MB)

---

### Pattern 2: Multipart Form-Data (For Large Files)

**When to use:** Large file uploads (images >10MB, videos, documents)

**API Code:**
```python
@app.post("/resize")
async def resize_image(
    file: UploadFile = File(...),
    width: int = Form(...),
    height: int = Form(...),
    preserve_aspect_ratio: bool = Form(True),
    compression_quality: int = Form(85)
):
    # IMPORTANT: All Form() parameters are received as strings
    # FastAPI auto-converts them, but be explicit:
    width = int(width) if isinstance(width, str) else width
    height = int(height) if isinstance(height, str) else height
```

**Test UI Code:**
```javascript
const formData = new FormData();
formData.append('file', file);
// IMPORTANT: Convert numbers to strings explicitly
formData.append('width', width.toString());
formData.append('height', height.toString());
formData.append('preserve_aspect_ratio', preserveAspectRatio.toString());
formData.append('compression_quality', compressionQuality.toString());

const response = await fetch(`${apiUrl}/resize`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`
    // DO NOT set Content-Type - browser will set it with boundary
  },
  body: formData
});
```

**Benefits:**
- ✅ Efficient for large files
- ✅ Native browser support
- ✅ Streaming possible

**Drawbacks:**
- ❌ More complex
- ❌ Proxy issues (now fixed)
- ❌ Harder to debug

---

## AI Prompt Updates Needed

### 1. API Code Generation Prompt

Add this section to `/backend/routes/generation.py` system prompt:

```
FILE UPLOAD STANDARDIZATION:

For file uploads, use ONE of these patterns consistently:

Pattern 1 - JSON with Base64 (RECOMMENDED for files <10MB):
```python
class UploadRequest(BaseModel):
    file_data: str  # base64-encoded file
    filename: str
    # other parameters as normal types (int, bool, str)

@app.post("/upload")
async def upload_file(request: UploadRequest):
    import base64
    file_bytes = base64.b64decode(request.file_data)
    # process file_bytes
```

Pattern 2 - Multipart Form-Data (for files >10MB):
```python
@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    param1: int = Form(...),
    param2: str = Form(...)
):
    # IMPORTANT: Convert Form() parameters if needed
    content = await file.read()
    # process content
```

CRITICAL: When using Pattern 1 (JSON), NEVER use UploadFile.
CRITICAL: When using Pattern 2 (multipart), ALWAYS use Form() for non-file parameters.
CRITICAL: Never mix patterns - choose one per endpoint.
```

### 2. Test UI Generation Prompt

Add this section to test UI generation prompt:

```
REQUEST FORMAT MATCHING:

Analyze the API code to determine request format:

If API uses Pydantic models (BaseModel):
- Endpoint expects JSON
- Use fetch with 'Content-Type': 'application/json'
- For files: Convert to base64 first
```javascript
const reader = new FileReader();
reader.onloadend = () => {
  const base64 = reader.result.split(',')[1];
  fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ file_data: base64, ...otherParams })
  });
};
reader.readAsDataURL(file);
```

If API uses UploadFile = File(...):
- Endpoint expects multipart/form-data
- Use FormData
- Convert all values to strings
- DO NOT set Content-Type header
```javascript
const formData = new FormData();
formData.append('file', file);
formData.append('width', width.toString());
fetch(url, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${apiKey}` },
  body: formData
});
```

CRITICAL: Match the API's pattern exactly. If unsure, prefer JSON with base64.
```

---

## Implementation Plan

### Phase 1: Update AI Prompts (Immediate)
1. Update API generation prompt to standardize on JSON+base64 by default
2. Update test UI generation prompt to match API patterns
3. Add validation that they align

### Phase 2: Migration (Short-term)
1. Add "Regenerate with JSON Format" button for existing APIs
2. Detect pattern mismatches and warn users
3. Provide migration guide for existing APIs

### Phase 3: Enforcement (Long-term)
1. Parse generated API code to extract parameter types
2. Generate test UI based on parsed contract
3. Validate before saving

---

## Testing Checklist

When generating an API with file uploads:

- [ ] Choose Pattern 1 (JSON) OR Pattern 2 (Multipart) - not both
- [ ] If JSON: API uses `BaseModel`, UI uses `base64` encoding
- [ ] If Multipart: API uses `Form()`, UI uses `FormData` with `.toString()`
- [ ] Test request succeeds without "parsing body" errors
- [ ] Test request succeeds without "boundary character" errors
- [ ] Parameters arrive with correct types (int, bool, str)

---

## Example: Complete Working Pair

### API Code (Pattern 1 - JSON):
```python
from pydantic import BaseModel
import base64
from PIL import Image
from io import BytesIO

class ResizeRequest(BaseModel):
    image_data: str  # base64
    width: int
    height: int
    preserve_aspect_ratio: bool = True
    quality: int = 85

@app.post("/resize")
async def resize_image(req: ResizeRequest):
    # Decode base64
    img_bytes = base64.b64decode(req.image_data)
    img = Image.open(BytesIO(img_bytes))

    # Resize
    if req.preserve_aspect_ratio:
        img.thumbnail((req.width, req.height))
    else:
        img = img.resize((req.width, req.height))

    # Save to MinIO...
    return {"status": "success", "url": "..."}
```

### Test UI (Pattern 1 - JSON):
```javascript
const handleSubmit = async () => {
  const reader = new FileReader();
  reader.onloadend = async () => {
    const base64 = reader.result.split(',')[1];

    const response = await fetch(`${apiUrl}/resize`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image_data: base64,
        width: width,
        height: height,
        preserve_aspect_ratio: preserveAspectRatio,
        quality: compressionQuality
      })
    });

    const data = await response.json();
    setResponse(data);
  };
  reader.readAsDataURL(file);
};
```

This pair is **guaranteed to work** because:
- Both use JSON
- No multipart complexity
- Types match exactly
- Gateway forwards perfectly

---

## Quick Fix for Existing APIs

If you have a multipart API that's failing, regenerate with this prompt:

```
Convert this API to use JSON with base64-encoded files instead of multipart/form-data.

Replace:
- UploadFile = File(...) → str field in Pydantic model
- Form(...) parameters → normal Pydantic fields

Add base64 decoding at the start of the endpoint.
```
