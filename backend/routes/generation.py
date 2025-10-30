"""
API Generation Routes
Handles AI-powered API code generation
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import anthropic
import sys
import os
import json

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import get_settings
from routes.auth import verify_token
from logger import logger

router = APIRouter()
settings = get_settings()


class GenerateAPIRequest(BaseModel):
    prompt: str
    apiName: str


class ClarificationRequest(BaseModel):
    prompt: str
    apiName: str


class SaveTestUIRequest(BaseModel):
    apiId: str
    componentCode: str
    codeSnapshot: str | None = None


class LoadTestUIRequest(BaseModel):
    apiId: str


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
    previousError: str = None
    retryAttempt: int = 0


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
    - CRITICAL: When accepting files with parameters, use Form() for each parameter, NOT Pydantic models
    - WRONG: async def upload(file: UploadFile = File(...), params: MyModel = None)
    - RIGHT: async def upload(file: UploadFile = File(...), width: int = Form(...), height: int = Form(...))
    - Example:
      ```python
      from fastapi import FastAPI, File, UploadFile, Form

      @app.post("/resize")
      async def resize_image(
          file: UploadFile = File(...),
          width: int = Form(...),
          height: int = Form(...),
          preserve_aspect_ratio: bool = Form(True)
      ):
      ```
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
    - Add docstring with curl example: curl -X POST -F "file=@image.jpg" -F "width=800" -F "height=600"

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
            model=settings.llm_model,
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
            model=settings.llm_model,
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
            model=settings.llm_model,
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

   - File Upload Pattern (e.g., async def resize(file: UploadFile, width: int = Form(...), height: int = Form(...)))
     * Append each parameter individually to FormData:
       const formData = new FormData();
       formData.append('file', selectedFile);
       formData.append('width', width.toString());
       formData.append('height', height.toString());
       formData.append('preserve_aspect_ratio', preserveRatio.toString());

4. For each endpoint, create:
   - Clear labeled form fields
   - "Test Endpoint" button
   - Loading state during request
   - Beautiful response display (JSON formatter, image preview, audio player)
   - Error handling with clear messages
   - CRITICAL: ALWAYS include Authorization header in ALL fetch requests:
     * headers: { 'Authorization': `Bearer ${apiKey}` }
     * This is MANDATORY - requests will fail without it

   - RESPONSE HANDLING - URLs in API responses:
     * If API returns a relative URL like "/images/uuid", convert it to absolute:
     * const imageUrl = response.url.startsWith('http') ? response.url : `${apiUrl}${response.url}`;
     * When displaying images from API responses, append Authorization header:
       - WRONG: <img src={response.url} /> (will fail with 401)
       - RIGHT: Use fetch with auth to get image, convert to blob URL:
         ```javascript
         const imgResponse = await fetch(fullUrl, {
           headers: { 'Authorization': `Bearer ${apiKey}` }
         });
         const blob = await imgResponse.blob();
         const blobUrl = URL.createObjectURL(blob);
         <img src={blobUrl} />
         ```
     * Same applies for audio files, PDFs, or any protected resource

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

9. JSX STRING SAFETY - CRITICAL:
   - ALWAYS use curly braces for dynamic values: {response.width}
   - NEVER break strings across lines in JSX
   - ALWAYS close all string literals with matching quotes
   - Use template literals for complex strings: `${value1} × ${value2}`
   - Escape special characters properly
   - Test that all strings are properly terminated before the component ends

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

        # Use streaming to ensure we get the complete response
        component_code = ""

        with client.messages.stream(
            model=settings.llm_model,
            max_tokens=4096,
            messages=[
                {"role": "user", "content": f"{system_prompt}\\n\\n{user_prompt}"}
            ]
        ) as stream:
            for text in stream.text_stream:
                component_code += text

        component_code = component_code.strip()

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

        # Log the component size for debugging
        logger.info(f"Generated component code length: {len(component_code)} characters")

        # Basic syntax validation - check for component completeness
        def validate_jsx_syntax(code):
            """Basic check for common syntax errors and completeness"""
            import re

            # Check if component ends properly with };
            if not code.strip().endswith('};'):
                logger.warning("Component does not end with '};' - likely truncated")
                return False

            # Check for balanced braces
            open_braces = code.count('{')
            close_braces = code.count('}')
            if open_braces != close_braces:
                logger.warning(f"Unbalanced braces: {open_braces} open, {close_braces} close")
                return False

            # Check for unterminated JSX elements (basic check)
            # Look for <span without closing or self-closing
            span_opens = len(re.findall(r'<span[^>]*>', code))
            span_closes = code.count('</span>')
            if span_opens != span_closes:
                logger.warning(f"Unbalanced span tags: {span_opens} open, {span_closes} close")
                # Don't fail on this, just warn

            return True

        # Validate the generated code
        is_valid = validate_jsx_syntax(component_code)

        if not is_valid:
            logger.error("Generated component has syntax errors or is incomplete")
            logger.error(f"Last 200 chars: {component_code[-200:]}")
            # Return a simple fallback component
            component_code = """const CustomAPITest = ({ apiUrl, apiKey }) => {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState('');

  return (
    <div className="space-y-4 p-6 bg-white rounded-lg shadow">
      <div className="text-center">
        <p className="text-gray-700">Custom test interface generation failed.</p>
        <p className="text-sm text-gray-500 mt-2">The AI generated an incomplete component. Please use the Test Endpoint buttons above.</p>
      </div>
    </div>
  );
};"""
        else:
            logger.info("Component validation passed")

        return {
            "componentCode": component_code,
            "language": "tsx"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate test UI: {str(e)}")


@router.post("/generate-test-ui-stream")
async def generate_test_ui_stream(request: TestUIRequest, user_id: str = Depends(verify_token)):
    """Generate custom React component for testing with streaming response"""
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

4. For FILE UPLOADS - ANALYZE THE FUNCTION SIGNATURE:
   - Add proper file input with drag-and-drop
   - Show file preview (images, audio player, etc.)
   - Display file size/type validation
   - Use FormData() for submission
   - CRITICAL: Include Authorization header even with FormData

5. Visual enhancements:
   - Use Tailwind CSS classes for styling
   - CRITICAL: ALL input fields must have dark text: className="... text-gray-900"
   - Add icons from lucide-react (available as LucideIcons.IconName)
   - Show request/response tabs
   - Copy button for results

6. Available libraries (passed as props to your component):
   - React: ALWAYS destructure ALL hooks you need at the top: const { useState, useEffect, useRef, useMemo, useCallback } = React;
   - CRITICAL: If you use useRef, you MUST destructure it from React
   - CRITICAL: If you use useMemo, you MUST destructure it from React
   - CRITICAL: If you use useCallback, you MUST destructure it from React
   - LucideIcons: use icons like <LucideIcons.Search className="..." />
   - ReactMarkdown: for rendering markdown responses
   - remarkGfm: for GitHub Flavored Markdown support
   - Example usage:
     ```
     const CustomAPITest = ({ apiUrl, apiKey, React, LucideIcons, ReactMarkdown, remarkGfm }) => {
       const { useState, useEffect, useRef } = React;
       const [response, setResponse] = useState('');
       const fileInputRef = useRef(null);

       // Display markdown response
       return <ReactMarkdown remarkPlugins={[remarkGfm]}>{response}</ReactMarkdown>;
     };
     ```

CRITICAL SYNTAX RULES (MUST FOLLOW):
   - EVERY string must be properly closed on the same line
   - EVERY className=" MUST have a closing " before the >
   - Be EXTREMELY careful with quotes - this is the #1 source of errors
   - Use template literals with backticks ` for multi-line strings
   - Always escape quotes inside strings: use \' or \" when needed
   - Double-check EVERY line has balanced quotes before moving to next line
   - All JSX tags must be properly closed
   - All braces {{ }} must be balanced
   - BEFORE finishing, scan through your entire component line-by-line and verify every quote is closed

Return ONLY the component code starting with 'const CustomAPITest = ...' and ending with '};'. No explanations, no markdown code blocks."""

        if request.previousError and request.retryAttempt > 0:
            previous_code_section = ""
            if request.previousCode:
                previous_code_section = f"""
PREVIOUS FAILED CODE:
```tsx
{request.previousCode}
```
"""

            user_prompt = f"""API Name: {request.apiName}
API ID: {request.apiId}
Endpoint URL: {request.endpointUrl}

FastAPI Code:
{request.code}

⚠️ PREVIOUS GENERATION FAILED WITH ERROR:
{request.previousError}
{previous_code_section}
This is retry attempt {request.retryAttempt}/3.

CRITICAL INSTRUCTIONS FOR FIXING:
1. Look at the error message carefully - it tells you the exact line number and issue
2. If you see "Unterminated string constant", check for:
   - Missing closing quotes in strings
   - Unescaped quotes inside strings (use \\' or \\")
   - Multi-line strings that need backticks or proper concatenation
3. If you see "Unexpected token" errors:
   - This usually means a string wasn't closed properly on a PREVIOUS line
   - Look at the line BEFORE the error line number
   - Check for missing closing quotes, especially in className attributes
   - Example BAD: className="border border-gray-200 rounded-lg p-4"> (missing opening quote)
   - Example GOOD: className="border border-gray-200 rounded-lg p-4">
4. If you see syntax errors:
   - Check all JSX tags are properly closed
   - Ensure all curly braces {{ }} are balanced
   - Make sure all parentheses and brackets match
5. Common JSX mistakes to avoid:
   - Don't use unescaped quotes in className or other JSX attributes
   - ALWAYS use double quotes for ALL className values
   - Use {{}} for JavaScript expressions in JSX, not single braces
   - Close all self-closing tags with />
   - Never put JSX comments inside JSX elements

VALIDATION CHECKLIST - Go through each line:
- Every opening quote has a closing quote on the same line
- Every className=" has a matching closing "
- Every opening tag < has a matching closing tag >
- Every opening brace has a matching closing brace
- Template literals use backticks not quotes
- No bare strings without quotes

Analyze the previous code and error, identify the EXACT issue, and generate a CORRECTED version that fixes it. Do not make the same mistake again."""
        elif request.improvementRequest and request.previousCode:
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

        async def stream_generator():
            try:
                component_code = ""

                with client.messages.stream(
                    model=settings.llm_model,
                    max_tokens=4096,
                    messages=[
                        {"role": "user", "content": f"{system_prompt}\\n\\n{user_prompt}"}
                    ]
                ) as stream:
                    for text in stream.text_stream:
                        component_code += text
                        # Send each chunk as JSON
                        yield f"data: {json.dumps({'type': 'chunk', 'content': text})}\n\n"

                # Clean up the final code
                component_code = component_code.strip()
                # Remove all code fence markers including language identifiers
                component_code = re.sub(r'```(javascript|typescript|jsx|tsx|js|ts)?\s*\n?', '', component_code)
                component_code = component_code.replace("```", "").strip()

                # Extract only the component code
                import re
                component_match = re.search(r'const\s+CustomAPITest\s*=', component_code, re.MULTILINE)
                if component_match:
                    component_code = component_code[component_match.start():]
                    arrow_match = re.search(r'=>\s*\{', component_code)
                    if arrow_match:
                        brace_count = 0
                        start_counting = False
                        end_index = len(component_code)

                        for i, char in enumerate(component_code):
                            if not start_counting and i >= arrow_match.end() - 1:
                                start_counting = True

                            if start_counting:
                                if char == '{':
                                    brace_count += 1
                                elif char == '}':
                                    brace_count -= 1
                                    if brace_count == 0:
                                        end_index = i + 1
                                        if end_index < len(component_code) and component_code[end_index] == ';':
                                            end_index += 1
                                        break

                        component_code = component_code[:end_index].strip()

                # Remove import/export statements
                lines = component_code.split('\n')
                cleaned_lines = [line for line in lines if not line.strip().startswith('import ') and not line.strip().startswith('export ')]
                component_code = '\n'.join(cleaned_lines).strip()

                # Validate syntax - check for common issues
                validation_passed = True
                validation_errors = []

                # Check for balanced quotes (simple heuristic)
                for i, line in enumerate(component_code.split('\n'), 1):
                    # Skip comments
                    if line.strip().startswith('//'):
                        continue

                    # Count quotes (ignoring escaped quotes)
                    line_clean = line.replace('\\"', '').replace("\\'", '')
                    double_quotes = line_clean.count('"')

                    # className should always have even quotes
                    if 'className=' in line and double_quotes % 2 != 0:
                        validation_passed = False
                        validation_errors.append(f"Line {i}: Unbalanced quotes in className")
                        logger.warning(f"Validation error on line {i}: {line}")

                if not validation_passed:
                    logger.warning(f"Generated code has validation errors: {validation_errors}")
                    # Still send it - the frontend will catch it and retry

                logger.info(f"Generated component code length: {len(component_code)} characters")

                # Send the final complete code
                yield f"data: {json.dumps({'type': 'complete', 'componentCode': component_code, 'language': 'tsx'})}\n\n"

            except Exception as e:
                error_msg = str(e)
                logger.error(f"Streaming error: {error_msg}")

                # Check for critical errors that need admin attention
                if "credit balance is too low" in error_msg.lower() or "insufficient credits" in error_msg.lower():
                    logger.critical(f"CRITICAL: Anthropic API credits exhausted! Error: {error_msg}")
                    error_msg = "API credit balance is too low. Please contact support or check your API configuration."

                yield f"data: {json.dumps({'type': 'error', 'message': error_msg})}\n\n"

        return StreamingResponse(
            stream_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate test UI: {str(e)}")


@router.post("/save-test-ui")
async def save_test_ui(request: SaveTestUIRequest, user_id: str = Depends(verify_token)):
    """Save generated test UI component to database"""
    try:
        from database import get_supabase_client
        supabase = get_supabase_client()

        # Check if user owns this API
        api_check = supabase.table('apis').select('user_id').eq('id', request.apiId).eq('user_id', user_id).execute()
        if not api_check.data or len(api_check.data) == 0:
            raise HTTPException(status_code=403, detail="Not authorized to save test UI for this API")

        # Deactivate any existing active components for this API
        supabase.table('test_ui_components').update({'is_active': False}).eq('api_id', request.apiId).eq('user_id', user_id).execute()

        # Save the new component
        result = supabase.table('test_ui_components').insert({
            'api_id': request.apiId,
            'user_id': user_id,
            'component_code': request.componentCode,
            'code_snapshot': request.codeSnapshot,
            'is_active': True,
            'generation_count': 1
        }).execute()

        return {"success": True, "componentId": result.data[0]['id']}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to save test UI: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save test UI: {str(e)}")


@router.get("/load-test-ui/{api_id}")
async def load_test_ui(api_id: str, user_id: str = Depends(verify_token)):
    """Load saved test UI component from database"""
    try:
        from database import get_supabase_client
        supabase = get_supabase_client()

        # Check if user owns this API
        api_check = supabase.table('apis').select('user_id').eq('id', api_id).eq('user_id', user_id).execute()
        if not api_check.data or len(api_check.data) == 0:
            raise HTTPException(status_code=403, detail="Not authorized to load test UI for this API")

        # Get the active component for this API
        result = supabase.table('test_ui_components').select('*').eq('api_id', api_id).eq('user_id', user_id).eq('is_active', True).execute()

        if not result.data or len(result.data) == 0:
            return {"success": False, "message": "No saved test UI found"}

        component = result.data[0]
        return {
            "success": True,
            "componentId": component['id'],
            "componentCode": component['component_code'],
            "codeSnapshot": component['code_snapshot'],
            "createdAt": component['created_at'],
            "updatedAt": component['updated_at']
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to load test UI: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to load test UI: {str(e)}")


@router.get("/list-test-ui/{api_id}")
async def list_test_ui(api_id: str, user_id: str = Depends(verify_token)):
    """List all saved test UI components for an API"""
    try:
        from database import supabase

        # Check if user owns this API
        api_check = supabase.table('apis').select('user_id').eq('id', api_id).eq('user_id', user_id).maybeSingle().execute()
        if not api_check.data:
            raise HTTPException(status_code=403, detail="Not authorized to list test UIs for this API")

        # Get all components for this API
        result = supabase.table('test_ui_components').select('id, is_active, generation_count, created_at, updated_at').eq('api_id', api_id).eq('user_id', user_id).order('created_at', desc=True).execute()

        return {"success": True, "components": result.data}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to list test UIs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list test UIs: {str(e)}")


@router.post("/activate-test-ui/{component_id}")
async def activate_test_ui(component_id: str, user_id: str = Depends(verify_token)):
    """Activate a specific saved test UI component"""
    try:
        from database import supabase

        # Get the component and verify ownership
        component = supabase.table('test_ui_components').select('api_id, user_id').eq('id', component_id).eq('user_id', user_id).maybeSingle().execute()
        if not component.data:
            raise HTTPException(status_code=404, detail="Test UI component not found")

        api_id = component.data['api_id']

        # Deactivate all components for this API
        supabase.table('test_ui_components').update({'is_active': False}).eq('api_id', api_id).eq('user_id', user_id).execute()

        # Activate the selected component
        supabase.table('test_ui_components').update({'is_active': True}).eq('id', component_id).execute()

        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to activate test UI: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to activate test UI: {str(e)}")
