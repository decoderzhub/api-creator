"""
API Generation Routes
Handles AI-powered API code generation
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import anthropic
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import get_settings
from routes.auth import verify_token

router = APIRouter()
settings = get_settings()


class GenerateAPIRequest(BaseModel):
    prompt: str
    apiName: str


class ClarificationRequest(BaseModel):
    prompt: str
    apiName: str


class DocumentationRequest(BaseModel):
    code: str
    apiName: str


class TestUIRequest(BaseModel):
    code: str
    apiName: str
    apiId: str
    endpointUrl: str
    improvementRequest: str = None
    previousCode: str = None


@router.post("/generate-api-code")
async def generate_api_code(request: GenerateAPIRequest, user_id: str = Depends(verify_token)):
    """Generate FastAPI code from natural language description using Anthropic Claude"""
    try:
        if not settings.anthropic_api_key:
            raise HTTPException(status_code=500, detail="Anthropic API key not configured")

        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

        system_prompt = """You are an expert FastAPI developer. Generate production-ready FastAPI code based on the user's description.

Requirements:
1. Use FastAPI with proper typing and validation
2. Include error handling where appropriate
3. Use Pydantic models for request/response validation
4. Include proper HTTP status codes and error responses
5. Add comprehensive docstrings explaining:
   - What the endpoint does
   - Required parameters and their types
   - Expected request format (JSON, multipart/form-data, query params)
   - Example curl command with proper headers
   - Response format
6. Follow REST best practices
7. Return ONLY the Python code, no explanations
8. CRITICAL: Only use these available libraries:
   - fastapi
   - pydantic
   - httpx (for HTTP requests)
   - typing (for type hints)
   - datetime
   - json
   - random
   - uuid
   - os (for environment variables)
   - io, base64 (for file handling)
   - PIL (Pillow) for image processing - AVAILABLE and RECOMMENDED
   DO NOT import any other external libraries like aiohttp, requests, passlib, bcrypt, opencv, numpy, pandas, etc.
9. For any data storage, use simple in-memory structures (dicts, lists) as this is a demo
10. Do NOT include authentication or rate limiting - keep it simple

11. FILE UPLOADS - CRITICAL GUIDELINES:
    - Use FastAPI's File and UploadFile from fastapi
    - Example: @app.post("/upload")\n           async def upload(file: UploadFile = File(...)):
    - Read file content: content = await file.read()
    - For IMAGE PROCESSING: Use PIL (Pillow) which is available
      * from PIL import Image
      * from io import BytesIO
      * image = Image.open(BytesIO(content))
      * image = image.resize((width, height))
      * buffer = BytesIO()
      * image.save(buffer, format='PNG')
      * resized_data = buffer.getvalue()
    - Always validate file type: file.content_type
    - Add docstring with curl example: curl -X POST -F "file=@image.jpg" -F "param=value"

12. SPECIAL INTEGRATIONS:
    - For sound/audio APIs, integrate Freesound.org API:
      * Use httpx to call: https://freesound.org/apiv2/search/text/
      * Get API key: FREESOUND_API_KEY = os.getenv("FREESOUND_API_KEY", "")
      * Add header: "Authorization": f"Token {FREESOUND_API_KEY}"
      * Search params: ?query=ocean+waves&fields=id,name,description,previews,duration
      * Return preview_hq_mp3 URL from previews object for playback

    - For image APIs: ALWAYS use PIL (Pillow) for actual image processing
      * PIL is available and should be used for resize, crop, rotate, filter operations
      * Return processed images as base64-encoded strings or file responses
      * Example operations: resize, thumbnail, crop, rotate, convert formats, apply filters

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

The code should be a complete, self-contained FastAPI application that can be executed with only the standard libraries listed above.

CRITICAL OUTPUT REQUIREMENTS:
- Return ONLY executable Python code
- NO explanatory text before the code
- NO explanatory text or notes after the code
- NO markdown formatting
- The response must be pure Python code that can be directly executed
- If you need to add notes, include them as comments within the code using # """

        user_prompt = f"""API Name: {request.apiName}

Description: {request.prompt}

Generate the complete FastAPI code for this API. Return ONLY the Python code with no additional text or explanations."""

        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=2000,
            messages=[
                {"role": "user", "content": f"{system_prompt}\n\n{user_prompt}"}
            ]
        )

        code = message.content[0].text

        code = code.replace("```python", "").replace("```", "").strip()

        # Remove any explanatory text after the code
        # Look for common patterns of trailing explanations
        lines = code.split('\n')
        clean_lines = []
        found_main = False

        for line in lines:
            # Stop if we find explanatory text patterns
            stripped = line.strip()
            if stripped.startswith('Note:') or stripped.startswith('Important:') or stripped.startswith('Explanation:'):
                break
            clean_lines.append(line)
            if 'if __name__ == "__main__"' in line:
                found_main = True

        # If we found the if __main__ block, take everything up to and including it
        code = '\n'.join(clean_lines)

        return {
            "code": code,
            "language": "python",
            "framework": "fastapi"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate API code: {str(e)}")


@router.post("/get-clarifications")
async def get_clarifications(request: ClarificationRequest, user_id: str = Depends(verify_token)):
    """Ask clarifying questions to generate better API code"""
    try:
        if not settings.anthropic_api_key:
            raise HTTPException(status_code=500, detail="Anthropic API key not configured")

        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

        system_prompt = """You are an expert API designer helping users create robust, production-ready APIs.

Analyze the user's API request and generate 3-5 clarifying questions that would help you create a better API.

Focus on:
1. **Data handling**: What format? File uploads? JSON? Query params?
2. **Input/Output**: What are the expected inputs and outputs?
3. **Business logic**: Any specific processing requirements?
4. **Error cases**: What errors should be handled?
5. **Integration**: Any third-party APIs needed?

For file uploads (images, audio, documents):
- Ask about accepted file types
- Ask about file size limits
- Ask about processing requirements (resize, convert, etc.)
- Ask if they need to store or just process

Return ONLY a JSON object with this structure:
{
  "needs_clarification": true/false,
  "questions": [
    {
      "question": "Question text",
      "options": ["Option 1", "Option 2"],
      "type": "choice" or "text"
    }
  ],
  "suggestions": ["Helpful suggestion 1", "Helpful suggestion 2"]
}

If the description is already detailed enough, set needs_clarification to false."""

        user_prompt = f"""API Name: {request.apiName}

Description: {request.prompt}

Analyze this and determine if clarifying questions would help create a better API."""

        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1500,
            messages=[
                {"role": "user", "content": f"{system_prompt}\n\n{user_prompt}"}
            ]
        )

        response_text = message.content[0].text.strip()

        import json
        response_text = response_text.replace("```json", "").replace("```", "").strip()
        clarifications = json.loads(response_text)

        return clarifications

    except json.JSONDecodeError as e:
        return {
            "needs_clarification": False,
            "questions": [],
            "suggestions": ["Provide more details about your API requirements"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get clarifications: {str(e)}")


@router.post("/generate-documentation")
async def generate_documentation(request: DocumentationRequest, user_id: str = Depends(verify_token)):
    """Generate comprehensive API documentation with proper examples"""
    try:
        if not settings.anthropic_api_key:
            raise HTTPException(status_code=500, detail="Anthropic API key not configured")

        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

        system_prompt = """You are a technical writer creating comprehensive API documentation.

Analyze the FastAPI code and generate detailed documentation in JSON format.

For each endpoint, provide:
1. **Accurate curl examples** with proper headers:
   - For file uploads: Use -F "file=@/path/to/file.jpg" (multipart/form-data)
   - For JSON: Use -H "Content-Type: application/json" -d '{"key": "value"}'
   - Always include: -H "Authorization: Bearer {api_key}"

2. **Request examples** in multiple languages (curl, JavaScript, Python)

3. **Response examples** with actual expected output

4. **Parameter details** with types, requirements, and examples

Return ONLY a JSON object with this structure:
{
  "endpoints": [
    {
      "method": "POST",
      "path": "/resize",
      "description": "Resize an uploaded image",
      "request_type": "multipart" or "json" or "query",
      "parameters": [
        {
          "name": "file",
          "type": "file",
          "location": "form" or "query" or "body" or "path",
          "required": true,
          "description": "Image file to resize",
          "example": "@/path/to/image.jpg"
        }
      ],
      "examples": {
        "curl": "curl -X POST https://api.example.com/resize -F \"file=@image.jpg\" -F \"width=800\" -H \"Authorization: Bearer API_KEY\"",
        "javascript": "const formData = new FormData();\nformData.append('file', fileInput.files[0]);\nfetch('https://api.example.com/resize', {method: 'POST', body: formData, headers: {'Authorization': 'Bearer API_KEY'}});",
        "python": "import requests\nfiles = {'file': open('image.jpg', 'rb')}\nrequests.post('https://api.example.com/resize', files=files, headers={'Authorization': 'Bearer API_KEY'})"
      },
      "response_example": {
        "status": 200,
        "body": {"image_url": "https://...", "width": 800, "height": 600}
      }
    }
  ]
}"""

        user_prompt = f"""API Name: {request.apiName}

Code:
{request.code}

Generate comprehensive documentation with accurate curl examples and proper headers."""

        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=2500,
            messages=[
                {"role": "user", "content": f"{system_prompt}\n\n{user_prompt}"}
            ]
        )

        response_text = message.content[0].text.strip()

        import json
        response_text = response_text.replace("```json", "").replace("```", "").strip()
        documentation = json.loads(response_text)

        return documentation

    except json.JSONDecodeError as e:
        return {"endpoints": []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate documentation: {str(e)}")


@router.post("/generate-test-ui")
async def generate_test_ui(request: TestUIRequest, user_id: str = Depends(verify_token)):
    """Generate custom React component for testing this specific API"""
    try:
        if not settings.anthropic_api_key:
            raise HTTPException(status_code=500, detail="Anthropic API key not configured")

        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

        system_prompt = """You are an expert React developer creating custom API testing interfaces.

Analyze the FastAPI code and generate a React component that creates a PERFECT testing UI for this specific API.

CRITICAL REQUIREMENTS:
1. Parse the code to understand ALL endpoints, parameters, and requirements
   - Look for @router.post(), @router.get(), etc. decorators to find endpoint paths
   - Check function signatures for path parameters like {width}, {height}
   - ANALYZE FUNCTION SIGNATURES CAREFULLY:
     * If you see: async def func(file: UploadFile = File(...), params: SomeModel = None)
     * This means file goes as file upload AND params must be sent as JSON string in FormData
     * Example: formData.append('file', file); formData.append('params', JSON.stringify({...}));
     * If you see: async def func(file: UploadFile = File(...), width: int, height: int)
     * This means individual form fields: formData.append('width', width); formData.append('height', height);
   - Identify whether parameters are in the path, query string, body, or form data
   - For Pydantic models in function params, check the model definition to see all required fields
   - CRITICAL URL CONSTRUCTION: The apiUrl provided does NOT have a trailing slash, so you MUST ensure proper slash handling
   - ALWAYS ensure there is exactly ONE slash between apiUrl and the endpoint path
   - WRONG: `${apiUrl}sounds/search/` (missing slash between apiUrl and 'sounds')
   - RIGHT: `${apiUrl}/sounds/search/` (has slash between apiUrl and 'sounds')
   - For path parameters, examples:
     * If apiUrl = "https://api.com/abc123" and endpoint is "/resize/{width}/{height}", use: `${apiUrl}/resize/${width}/${height}`
     * If @router.get("/sounds/search/"), use: `${apiUrl}/sounds/search/?query=...`
     * If @router.get("/sounds/{sound_id}"), use: `${apiUrl}/sounds/${soundId}`

2. Initialize ALL numeric state with actual numbers (not empty strings):
   - WRONG: const [width, setWidth] = useState('');
   - RIGHT: const [width, setWidth] = useState(100);
   - Always provide sensible defaults for all parameters

3. Create appropriate input controls for each parameter type:
   - File uploads: <input type="file" accept="..." />
   - Numbers: <input type="number" value={state} onChange={(e) => setState(parseInt(e.target.value) || 0)} />
   - Text: <input type="text" />
   - Booleans: <input type="checkbox" />
   - Enums/choices: <select> dropdown
   - JSON objects: <textarea> with validation
   - ALWAYS parse number inputs with parseInt() or parseFloat() and provide fallback values

3. For FILE UPLOADS - ANALYZE THE FUNCTION SIGNATURE:
   - Add proper file input with drag-and-drop
   - Show file preview (images, audio player, etc.)
   - Display file size/type validation
   - Use FormData() for submission
   - CRITICAL: Include Authorization header even with FormData:
     * const formData = new FormData();
     * formData.append('file', file);
     * fetch(url, { method: 'POST', body: formData, headers: { 'Authorization': `Bearer ${apiKey}` } })

   - PATTERN 1: File + Pydantic Model (e.g., async def resize(file: UploadFile, params: ResizeRequest))
     * Look for Pydantic model class definition (class ResizeRequest(BaseModel):)
     * Extract all fields from the model (width, height, preserve_aspect_ratio, etc.)
     * Create UI inputs for each field with proper defaults
     * Build JSON object from user inputs and append as string:
       const formData = new FormData();
       formData.append('file', selectedFile);
       formData.append('params', JSON.stringify({
         width: widthValue,
         height: heightValue,
         preserve_aspect_ratio: preserveRatio,
         optimize: optimizeValue
       }));

   - PATTERN 2: File + Individual Params (e.g., async def resize(file: UploadFile, width: int, height: int))
     * Append each parameter individually to FormData:
       const formData = new FormData();
       formData.append('file', selectedFile);
       formData.append('width', width.toString());
       formData.append('height', height.toString());

4. For each endpoint, create:
   - Clear labeled form fields
   - "Test Endpoint" button
   - Loading state during request
   - Beautiful response display (JSON formatter, image preview, audio player)
   - Error handling with clear messages
   - CRITICAL: ALWAYS include Authorization header in ALL fetch requests:
     * headers: { 'Authorization': `Bearer ${apiKey}` }
     * This is MANDATORY - requests will fail without it

5. Visual enhancements:
   - Use Tailwind CSS classes for styling
   - CRITICAL: ALL input fields must have dark text: className="... text-gray-900"
   - CRITICAL: All text inputs and number inputs must have: className="w-full px-3 py-2 border rounded text-gray-900"
   - Add icons from lucide-react (available as LucideIcons.IconName)
   - Show request/response tabs
   - Copy button for results
   - Success/error toast notifications

6. CRITICAL CODE STRUCTURE - DO NOT USE IMPORTS:
   ```tsx
   const CustomAPITest = ({ apiUrl, apiKey }) => {
     // React hooks are available as: useState, useEffect
     // Lucide icons available as: LucideIcons.Upload, LucideIcons.Play, etc.

     const [loading, setLoading] = useState(false);
     const [response, setResponse] = useState(null);
     const [error, setError] = useState('');

     const handleSubmit = async () => {
       setLoading(true);
       setError('');
       try {
         // CRITICAL: ALWAYS include Authorization header
         const response = await fetch(`${apiUrl}/endpoint`, {
           method: 'POST',
           headers: {
             'Authorization': `Bearer ${apiKey}`,
             'Content-Type': 'application/json'
           },
           body: JSON.stringify({ param: value })
         });

         const data = await response.json();
         if (!response.ok) throw new Error(data.detail || 'Request failed');
         setResponse(data);
       } catch (err) {
         setError(err.message);
       } finally {
         setLoading(false);
       }
     };

     return (
       <div className="space-y-6">
         {/* Parameter inputs */}
         {/* Test button */}
         {/* Response display */}
       </div>
     );
   };
   ```

7. ABSOLUTELY NO IMPORT STATEMENTS - All dependencies are provided as globals:
   - useState, useEffect are available directly
   - Icons: LucideIcons.Upload, LucideIcons.Play, LucideIcons.AlertCircle, etc.
   - DO NOT write: import { useState } from 'react'
   - DO NOT write: import { Upload } from 'lucide-react'

8. CRITICAL: Return ONLY the component function definition starting with "const CustomAPITest"
   - NO explanatory text before the code
   - NO explanatory text after the code
   - NO markdown formatting
   - ONLY the JavaScript/TypeScript code
   - Start immediately with: const CustomAPITest = ({ apiUrl, apiKey }) => {
   - End immediately after the closing }; of the component

9. For IMAGE APIs: Include image preview after upload and after response
10. For AUDIO APIs: Include audio player for testing playback
11. For DATA APIs: Include JSON formatter and copy functionality

Make it production-quality, beautiful, and intuitive."""

        if request.improvementRequest and request.previousCode:
            user_prompt = f"""API Name: {request.apiName}
API ID: {request.apiId}
Endpoint URL: {request.endpointUrl}

FastAPI Code:
{request.code}

Previous Component Code:
{request.previousCode}

User's Improvement Request: {request.improvementRequest}

Regenerate the test UI component with the requested improvements. Keep the same overall structure but apply the specific changes requested by the user."""
        else:
            user_prompt = f"""API Name: {request.apiName}
API ID: {request.apiId}
Endpoint URL: {request.endpointUrl}

FastAPI Code:
{request.code}

Generate a custom React testing component specifically designed for this API's functionality."""

        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=3000,
            messages=[
                {"role": "user", "content": f"{system_prompt}\\n\\n{user_prompt}"}
            ]
        )

        component_code = message.content[0].text.strip()

        # Clean up code blocks and remove any import/export statements
        component_code = component_code.replace("```tsx", "").replace("```typescript", "").replace("```jsx", "").replace("```", "").strip()

        # Extract only the component code (remove explanatory text before/after)
        # Look for the component definition
        import re

        # Find the start of the component definition
        component_match = re.search(r'const\s+CustomAPITest\s*=', component_code, re.MULTILINE)
        if component_match:
            # Extract from the component definition to the end
            component_code = component_code[component_match.start():]

            # Find the arrow function body opening brace (not parameter destructuring)
            # Look for "=> {" pattern
            arrow_match = re.search(r'=>\s*\{', component_code)
            if arrow_match:
                # Start counting braces from the function body
                brace_count = 0
                start_counting = False
                end_index = len(component_code)

                for i, char in enumerate(component_code):
                    # Start counting at the function body brace (after =>)
                    if not start_counting and i >= arrow_match.end() - 1:
                        start_counting = True

                    if start_counting:
                        if char == '{':
                            brace_count += 1
                        elif char == '}':
                            brace_count -= 1
                            if brace_count == 0:
                                # Found the end of the component
                                end_index = i + 1
                                # Look for the semicolon after the closing brace
                                if end_index < len(component_code) and component_code[end_index] == ';':
                                    end_index += 1
                                break

                component_code = component_code[:end_index].strip()
            else:
                # No arrow function pattern found, just keep as is
                pass

        # Remove import statements (in case AI includes them)
        lines = component_code.split('\n')
        cleaned_lines = []
        for line in lines:
            if not line.strip().startswith('import ') and not line.strip().startswith('export '):
                cleaned_lines.append(line)
        component_code = '\n'.join(cleaned_lines).strip()

        return {
            "componentCode": component_code,
            "language": "tsx"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate test UI: {str(e)}")
