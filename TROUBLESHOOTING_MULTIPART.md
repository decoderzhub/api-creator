# Troubleshooting Multipart Upload Errors

## Error: "Did not find boundary character 102 at index 2"

This error occurs when FastAPI cannot parse the multipart/form-data request body.

### Quick Fix for Container Code

Add logging middleware to your container's `main.py` to see what's actually being received:

```python
from fastapi import Request

@app.middleware("http")
async def log_requests(request: Request, call_next):
    print(f"=== REQUEST to {request.url.path} ===")
    print(f"Method: {request.method}")
    print(f"Headers: {dict(request.headers)}")
    print(f"Content-Type: {request.headers.get('content-type')}")

    # Try to read body (be careful with this - it consumes the stream)
    # body = await request.body()
    # print(f"Body length: {len(body)}")
    # print(f"First 200 bytes: {body[:200]}")

    response = await call_next(request)
    return response
```

### Common Causes

1. **Missing Content-Type boundary**: The browser should set `Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...` automatically when using FormData. If this is missing or malformed, FastAPI can't parse the request.

2. **API Gateway proxy issues**: If requests go through a proxy/gateway (like `/run/{api_id}/resize`), the proxy might be:
   - Stripping or modifying headers
   - Buffering the body incorrectly
   - Changing the Content-Type

3. **Manual Content-Type override**: If you manually set `Content-Type: multipart/form-data` without the boundary parameter, it will fail. Let the browser set it automatically with FormData.

### Solution 1: Ensure No Content-Type Override

Frontend should NOT manually set Content-Type when using FormData:

```javascript
// ✅ CORRECT - Let browser set Content-Type with boundary
const formData = new FormData();
formData.append('file', file);
formData.append('width', width.toString());  // Convert to string explicitly
formData.append('height', height.toString());

const res = await fetch(`${apiUrl}/resize`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`
    // NO Content-Type here!
  },
  body: formData
});
```

```javascript
// ❌ WRONG - Don't set Content-Type manually
headers: {
  'Authorization': `Bearer ${apiKey}`,
  'Content-Type': 'multipart/form-data'  // Missing boundary!
}
```

### Solution 2: Convert Values to Strings Explicitly

FormData sends everything as strings. Make conversions explicit:

```javascript
formData.append('width', width.toString());
formData.append('height', height.toString());
formData.append('preserve_aspect_ratio', preserveAspectRatio.toString());
formData.append('compression_quality', compressionQuality.toString());
```

### Solution 3: Check API Gateway Proxy

If using a FastAPI gateway that proxies requests to containers, ensure it preserves headers:

```python
# In your proxy endpoint
@app.api_route("/run/{api_id}/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy_to_user_api(api_id: str, request: Request, path: str = ""):
    # Get container port
    port = api_deployer.get_api_port(api_id)

    # Forward request to container
    async with httpx.AsyncClient() as client:
        # IMPORTANT: Preserve Content-Type header with boundary!
        headers = dict(request.headers)

        # Forward the request body as-is
        body = await request.body()

        response = await client.request(
            method=request.method,
            url=f"http://localhost:{port}/{path}",
            headers=headers,
            content=body,  # Use content= not data= to preserve raw body
            timeout=30.0
        )
```

### Debugging Steps

1. **Check browser network tab**:
   - Look at the request headers
   - Verify Content-Type includes `boundary=`
   - Check if body is properly encoded

2. **Add logging to container**:
   - Log Content-Type header
   - Log body length
   - Log first 200 bytes of body

3. **Test with curl**:
```bash
curl -X POST http://localhost:PORT/resize \
  -H "Authorization: Bearer YOUR_KEY" \
  -F "file=@test.jpg" \
  -F "width=800" \
  -F "height=600" \
  -F "preserve_aspect_ratio=true" \
  -F "compression_quality=85"
```

4. **Check gateway logs**: If using a proxy, check if it's modifying the request.

### Alternative: Use Base64 Encoding

If multipart continues to fail, convert image to base64:

```python
from pydantic import BaseModel
import base64

class ResizeRequest(BaseModel):
    image_data: str  # base64-encoded image
    width: int
    height: int
    preserve_aspect_ratio: bool = True
    compression_quality: int = 85

@app.post("/resize")
async def resize_image(request: ResizeRequest):
    # Decode base64
    image_bytes = base64.b64decode(request.image_data)
    image = Image.open(BytesIO(image_bytes))
    # ... rest of processing
```

Frontend:
```javascript
const reader = new FileReader();
reader.onloadend = async () => {
  const base64 = reader.result.split(',')[1];  // Remove data:image/jpeg;base64,

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
