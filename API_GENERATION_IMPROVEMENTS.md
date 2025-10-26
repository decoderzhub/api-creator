# API Generation Improvements

## Problem Identified

You correctly identified two critical UX issues:

### 1. **Incomplete Documentation for File Uploads**
The generated curl examples showed file uploads incorrectly:
```bash
# ❌ WRONG - Shows query parameter
curl -X POST "https://api.example.com/resize?file=value"

# ✅ CORRECT - Should use multipart/form-data
curl -X POST "https://api.example.com/resize" \
  -H "Authorization: Bearer API_KEY" \
  -F "file=@/path/to/image.jpg" \
  -F "width=800" \
  -F "height=600"
```

**Why this matters:**
- Developers can't use the API without proper documentation
- File uploads require specific headers (`multipart/form-data`)
- Query params (`?file=value`) don't work for binary data

### 2. **AI Generation Lacks Context**
The AI generates code in a single shot without:
- Asking clarifying questions
- Understanding file handling requirements
- Generating comprehensive documentation
- Providing examples in multiple languages

## Solutions Implemented

### 1. Enhanced AI Code Generation Prompt

**File:** `fastapi-backend/routes/generation.py`

**Added comprehensive guidelines:**
```python
11. FILE UPLOADS - CRITICAL GUIDELINES:
    - Use FastAPI's File and UploadFile from fastapi
    - Example: @app.post("/upload")
               async def upload(file: UploadFile = File(...)):
    - Read file content: content = await file.read()
    - For images: Use base64 encoding for simple processing
    - Always validate file type: file.content_type
    - Add docstring with curl example

13. DOCSTRING FORMAT (include in every endpoint):
    \"\"\"
    Brief description of what this endpoint does.

    Parameters:
    - param1 (type): Description
    - file (file): Image/audio/document file

    Request Format: multipart/form-data OR application/json

    Example:
    ```bash
    curl -X POST "http://localhost:8000/endpoint" \\
      -H "Authorization: Bearer {api_key}" \\
      -F "file=@/path/to/file.jpg" \\
      -F "param=value"
    ```

    Response:
    {\"status\": \"success\", \"result\": {...}}
    \"\"\"
```

**Now the AI will:**
- Use proper FastAPI file upload syntax
- Include comprehensive docstrings with curl examples
- Show correct headers and request format
- Validate file types

### 2. New Clarification Endpoint

**File:** `fastapi-backend/routes/generation.py`
**Endpoint:** `POST /get-clarifications`

**Purpose:** Ask intelligent questions before generating code

**Example Response:**
```json
{
  "needs_clarification": true,
  "questions": [
    {
      "question": "What file types should the API accept?",
      "options": ["Images (JPG, PNG)", "Audio (MP3, WAV)", "Documents (PDF)", "Any file type"],
      "type": "choice"
    },
    {
      "question": "What should happen to uploaded files?",
      "options": ["Process and return result", "Store for later", "Process and store"],
      "type": "choice"
    },
    {
      "question": "Are there file size limits?",
      "type": "text"
    }
  ],
  "suggestions": [
    "Consider adding file type validation",
    "Add error handling for large files"
  ]
}
```

### 3. Documentation Generation Endpoint

**File:** `fastapi-backend/routes/generation.py`
**Endpoint:** `POST /generate-documentation`

**Purpose:** Generate comprehensive docs with proper examples

**What it provides:**
- Accurate curl examples with correct headers
- JavaScript fetch examples
- Python requests examples
- Expected response formats
- Parameter details with types

**Example Output:**
```json
{
  "endpoints": [
    {
      "method": "POST",
      "path": "/resize",
      "description": "Resize an uploaded image",
      "request_type": "multipart",
      "parameters": [
        {
          "name": "file",
          "type": "file",
          "location": "form",
          "required": true,
          "description": "Image file to resize",
          "example": "@/path/to/image.jpg"
        },
        {
          "name": "width",
          "type": "integer",
          "location": "form",
          "required": false,
          "description": "Target width in pixels"
        }
      ],
      "examples": {
        "curl": "curl -X POST https://api.example.com/resize -F \"file=@image.jpg\" -F \"width=800\" -H \"Authorization: Bearer API_KEY\"",
        "javascript": "const formData = new FormData();\nformData.append('file', fileInput.files[0]);\nformData.append('width', 800);\nfetch('https://api.example.com/resize', {\n  method: 'POST',\n  body: formData,\n  headers: {'Authorization': 'Bearer API_KEY'}\n});",
        "python": "import requests\nfiles = {'file': open('image.jpg', 'rb')}\ndata = {'width': 800}\nrequests.post('https://api.example.com/resize', files=files, data=data, headers={'Authorization': 'Bearer API_KEY'})"
      },
      "response_example": {
        "status": 200,
        "body": {
          "image_url": "https://...",
          "width": 800,
          "height": 600,
          "format": "jpg"
        }
      }
    }
  ]
}
```

### 4. Enhanced Endpoint Parser

**File:** `src/lib/endpoints.ts`

**New Features:**
- Detects `UploadFile` and `File()` parameters
- Identifies request type (json/multipart/query)
- Generates correct curl examples for file uploads
- Extracts docstrings from generated code

**Key Improvements:**
```typescript
// Now detects file parameters
if (param.includes('UploadFile') || param.includes('File(')) {
  parameters.push({
    name: paramName,
    type: 'file',
    required: param.includes('File(...)') || !param.includes('='),
    description: 'File upload',
    fileType: 'any'
  });
}

// Determines request type
const hasFiles = parameters.some(p => p.type === 'file');
let requestType = hasFiles ? 'multipart' : 'json';

// Generates proper curl for files
if (fileParams.length > 0) {
  fileParams.forEach(param => {
    curlCmd += ` \\\n  -F "${param.name}=@/path/to/${fileName}"`;
  });
  // Add other params as form fields
  queryParams.forEach(param => {
    curlCmd += ` \\\n  -F "${param.name}=${exampleValue}"`;
  });
}
```

## Recommended Workflow Enhancement

### Current Flow (Single-Shot):
1. User enters description
2. AI generates code
3. User sees API (maybe confused about usage)

### Proposed Flow (Interactive):
1. User enters description
2. **AI asks clarifying questions** ⭐ NEW
3. User answers questions
4. AI generates better code with examples
5. **System generates documentation** ⭐ NEW
6. User sees comprehensive docs with curl/JS/Python examples

## Example: Picture Resize API

### What User Types:
```
"Create an API that resizes images"
```

### AI Asks (NEW):
1. "What file types? (JPG, PNG, GIF, All)"
2. "How should dimensions be specified? (width/height, scale, preset sizes)"
3. "What should the API return? (Base64, URL, Binary)"
4. "Any size limits? (e.g., 10MB max)"

### AI Generates Better Code:
```python
from fastapi import FastAPI, File, UploadFile, Form
from typing import Optional

app = FastAPI()

@app.post("/resize")
async def resize_image(
    file: UploadFile = File(...),
    width: Optional[int] = Form(None),
    height: Optional[int] = Form(None)
):
    \"\"\"
    Resize an uploaded image to specified dimensions.

    Parameters:
    - file (file): Image file to resize (JPG, PNG, GIF)
    - width (int, optional): Target width in pixels
    - height (int, optional): Target height in pixels

    Request Format: multipart/form-data

    Example:
    ```bash
    curl -X POST "http://localhost:8000/resize" \\
      -H "Authorization: Bearer {api_key}" \\
      -F "file=@/path/to/image.jpg" \\
      -F "width=800" \\
      -F "height=600"
    ```

    Response:
    {
      "status": "success",
      "image_id": "abc123",
      "width": 800,
      "height": 600,
      "format": "jpg"
    }
    \"\"\"

    # Validate file type
    if file.content_type not in ["image/jpeg", "image/png", "image/gif"]:
        return {"error": "Invalid file type"}

    # Read file content
    content = await file.read()

    # Process image (simplified for demo)
    result = {
        "status": "success",
        "filename": file.filename,
        "size": len(content),
        "width": width or "auto",
        "height": height or "auto"
    }

    return result
```

### Documentation Shows (NEW):
```markdown
## POST /resize

Upload and resize an image

### Request Format: multipart/form-data

### Parameters:
| Name   | Type    | Required | Location | Description                |
|--------|---------|----------|----------|----------------------------|
| file   | file    | Yes      | form     | Image file (JPG, PNG, GIF) |
| width  | integer | No       | form     | Target width in pixels     |
| height | integer | No       | form     | Target height in pixels    |

### cURL Example:
```bash
curl -X POST "https://api-creator.com/your-api/resize" \
  -H "Authorization: Bearer your-api-key" \
  -F "file=@/path/to/image.jpg" \
  -F "width=800" \
  -F "height=600"
```

### JavaScript Example:
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('width', 800);
formData.append('height', 600);

fetch('https://api-creator.com/your-api/resize', {
  method: 'POST',
  body: formData,
  headers: {
    'Authorization': 'Bearer your-api-key'
  }
})
.then(response => response.json())
.then(data => console.log(data));
```

### Python Example:
```python
import requests

files = {'file': open('image.jpg', 'rb')}
data = {'width': 800, 'height': 600}
headers = {'Authorization': 'Bearer your-api-key'}

response = requests.post(
    'https://api-creator.com/your-api/resize',
    files=files,
    data=data,
    headers=headers
)
print(response.json())
```

### Response Example:
```json
{
  "status": "success",
  "image_id": "abc123",
  "width": 800,
  "height": 600,
  "format": "jpg"
}
```
```

## Impact

### Before:
- ❌ Confusing curl examples (`?file=value`)
- ❌ No guidance on headers
- ❌ Generic, one-size-fits-all APIs
- ❌ Developers have to guess

### After:
- ✅ Accurate curl examples with `-F "file=@image.jpg"`
- ✅ Proper headers shown (`multipart/form-data` handled automatically)
- ✅ Context-aware APIs tailored to user's needs
- ✅ Multiple language examples
- ✅ Clear documentation from the start

## Next Steps

### Frontend Integration (Needed):
1. Add "Get Clarifications" button before generation
2. Show clarifying questions in a modal/form
3. Call `/get-clarifications` endpoint
4. Display questions and collect answers
5. Pass answers to generation step
6. After generation, call `/generate-documentation`
7. Display rich documentation with tabs for each language

### UI Mockup:
```
┌─────────────────────────────────────┐
│ Generate API                        │
├─────────────────────────────────────┤
│ Name: Picture Resizer               │
│ Description: Resize images          │
│                                     │
│ [Get Suggestions] [Generate]        │
└─────────────────────────────────────┘

↓ User clicks "Get Suggestions"

┌─────────────────────────────────────┐
│ Let's make this API better!         │
├─────────────────────────────────────┤
│ 1. What file types?                 │
│    ○ Images (JPG, PNG)              │
│    ○ Audio files                    │
│    ○ Documents                      │
│                                     │
│ 2. What should it return?           │
│    ○ Processed file URL             │
│    ○ Base64 encoded                 │
│    ○ File metadata only             │
│                                     │
│ 3. File size limit?                 │
│    [___________] MB                 │
│                                     │
│ [Cancel] [Generate with Context]    │
└─────────────────────────────────────┘

↓ After generation

┌─────────────────────────────────────┐
│ Your API is Ready!                  │
├─────────────────────────────────────┤
│ [Endpoints] [cURL] [JavaScript]     │
│             [Python] [Code]         │
├─────────────────────────────────────┤
│ POST /resize                        │
│                                     │
│ curl -X POST "..." \                │
│   -F "file=@image.jpg" \            │
│   -F "width=800"                    │
│                                     │
│ [Copy] [Test in Playground]         │
└─────────────────────────────────────┘
```

## Files Modified

1. **fastapi-backend/routes/generation.py**
   - Enhanced AI prompt with file upload guidelines
   - Added `/get-clarifications` endpoint
   - Added `/generate-documentation` endpoint

2. **src/lib/endpoints.ts**
   - Added `file` parameter type
   - Added `requestType` detection
   - Enhanced curl example generation for multipart uploads
   - Added docstring extraction

## Testing

### To test the improvements:

1. **Generate a file upload API:**
   ```
   "Create an API that accepts image uploads and returns the file size"
   ```

2. **Check the curl example:**
   - Should show `-F "file=@image.jpg"` NOT `?file=value`
   - Should show proper Authorization header

3. **Test the clarification endpoint:**
   ```bash
   curl -X POST http://localhost:8000/api/get-clarifications \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer your-token" \
     -d '{
       "apiName": "Image Processor",
       "prompt": "Upload and resize images"
     }'
   ```

4. **Test the documentation endpoint:**
   ```bash
   curl -X POST http://localhost:8000/api/generate-documentation \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer your-token" \
     -d '{
       "apiName": "Image Processor",
       "code": "...generated FastAPI code..."
     }'
   ```

## Summary

You were absolutely correct that:
1. The curl examples were wrong for file uploads
2. The AI needs to gather more context before generating

These changes make your platform **significantly more production-ready** by:
- Providing accurate, copy-paste-ready examples
- Generating context-aware APIs
- Including comprehensive documentation
- Supporting multiple programming languages

The backend is ready. The frontend just needs to call these new endpoints to create an interactive, guided API generation experience.
