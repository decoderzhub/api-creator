# Current API Architecture Documentation

## Overview
This document explains how user-generated APIs are currently loaded and executed in the API Builder platform.

---

## Architecture Components

### 1. API Loader (`backend/api_loader.py`)

**Purpose**: Dynamically loads user-generated Python code from the database and creates executable handlers.

**Key Components**:

#### APIHandler Class
- **Purpose**: Wrapper for individual user API code
- **Initialization**: Takes `api_id`, `code` (Python code as string), and `metadata`
- **Loading Method**: Uses Python's `exec()` to execute code in an isolated namespace

```python
def _load_code(self):
    """Dynamically load Python code into a module"""
    # Create a new module for this API
    module_name = f"user_api_{self.api_id.replace('-', '_')}"
    self.module = types.ModuleType(module_name)

    # Create a safe execution namespace
    namespace = {
        "__name__": module_name,
        "__file__": f"<api:{self.api_id}>",
        "print": print,  # Allow printing for debugging
    }

    # Execute the code in the module's namespace
    exec(self.code, namespace)
    self.module.__dict__.update(namespace)
```

**Critical Observations**:
1. ✅ Creates a separate module for each API
2. ✅ Uses `exec()` to execute user code
3. ⚠️ **All APIs share the same Python process and dependencies**
4. ⚠️ **No dependency isolation** - all APIs must use the same installed packages
5. ⚠️ **Memory shared** - APIs can potentially interfere with each other

#### APILoader Class
- **Purpose**: Manages loading and caching of multiple APIs
- **Storage**: In-memory dictionary `self.apis: Dict[str, APIHandler] = {}`
- **Loading**: Fetches code from Supabase `apis` table, column `code_snapshot`

---

### 2. Gateway (`backend/main.py`)

**Purpose**: Main FastAPI application that routes requests to user APIs

**Key Flow**:

```python
@app.api_route("/run/{api_id}/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy_to_user_api(api_id: str, request: Request, path: str = ""):
    # 1. Verify API key
    api_metadata = await verify_api_key(api_id, api_key)

    # 2. Check rate limits
    is_allowed, rate_limit_info = await check_rate_limit(user_id, user_plan, custom_rate_limit)

    # 3. Get or load API handler
    api_handler = api_loader.get_api(api_id)
    if not api_handler:
        await api_loader.load_api(api_id)

    # 4. Execute using TestClient
    user_app = api_handler.get_app()
    from starlette.testclient import TestClient
    client = TestClient(user_app)

    # 5. Proxy the request
    response = method_fn(url, data=body, headers=dict(request.headers))

    # 6. Log usage and return
    await log_api_usage(...)
    return response
```

**Execution Method**: Uses Starlette's `TestClient` to call user APIs in-process

---

## Current Issues

### 1. **Dependency Conflicts**
- ❌ All user APIs share the same Python environment
- ❌ If User A's API needs `pillow==9.0` and User B needs `pillow==10.0`, conflict occurs
- ❌ Cannot install user-specific packages dynamically

### 2. **Security Concerns**
- ⚠️ All APIs run in the same process (can access each other's memory)
- ⚠️ `exec()` is used with minimal sandboxing
- ⚠️ APIs can potentially access the main application's internals

### 3. **Resource Isolation**
- ❌ No CPU/memory limits per API
- ❌ One API can crash or slow down all others
- ❌ No process isolation

### 4. **File Upload Issues**
- ❌ Currently using `TestClient` which doesn't handle `FormData` properly
- ❌ Line 306 in `main.py`: `response = method_fn(url, data=body, headers=dict(request.headers))`
  - This sends raw body, not parsed multipart/form-data
  - FastAPI expects `File()` and `Form()` parameters but receives raw bytes

### 5. **Scalability**
- ❌ All APIs loaded into single process memory
- ❌ No horizontal scaling capability
- ❌ Startup time increases with number of APIs

---

## How File Uploads Currently Work (or Don't)

### The Problem:

1. **User API expects**:
   ```python
   @app.post("/resize")
   async def resize_image(
       file: UploadFile = File(...),
       width: int = Form(...),
       height: int = Form(...)
   ):
   ```

2. **Gateway sends**:
   ```python
   # Line 301-306 in main.py
   body = await request.body()  # Gets raw bytes
   response = method_fn(url, data=body, headers=dict(request.headers))
   ```

3. **What happens**:
   - `TestClient` receives raw bytes as `data=body`
   - FastAPI's `File()` and `Form()` parsers expect multipart/form-data structure
   - Parser fails → 422 Unprocessable Entity

### Why TestClient Doesn't Work:

`TestClient` is designed for testing, not proxying. It doesn't properly forward:
- Multipart form boundaries
- File metadata
- Form field parsing

---

## Configuration (`backend/config.py`)

**Dependencies Available**:
- Limited to what's in `requirements.txt`
- User APIs cannot install custom packages
- No per-API configuration

---

## Recommendations

### Short-term Fixes (Quick):

1. **Fix File Upload Proxying**:
   - Parse the multipart/form-data in gateway
   - Reconstruct FormData for TestClient
   - OR: Use `httpx.AsyncClient` instead of `TestClient`

   ```python
   import httpx
   from fastapi import UploadFile

   # Parse incoming multipart data
   form = await request.form()

   # Forward to user API using httpx
   files = {}
   data = {}
   for key, value in form.items():
       if isinstance(value, UploadFile):
           files[key] = (value.filename, await value.read(), value.content_type)
       else:
           data[key] = value

   async with httpx.AsyncClient() as client:
       response = await client.post(
           f"http://localhost:internal_port/{path}",
           files=files,
           data=data
       )
   ```

2. **Run each API on a separate port internally**:
   - Each API gets its own uvicorn process
   - Gateway proxies to the correct port
   - Better isolation, but still shared dependencies

### Medium-term (Better):

3. **Docker Containers per API**:
   - Each API runs in its own container
   - Custom `requirements.txt` per API
   - Full isolation
   - Gateway routes to container ports

4. **Process-based Isolation**:
   - Spawn subprocess for each API
   - Use `multiprocessing` or `subprocess`
   - Better than current, cheaper than Docker

### Long-term (Production-Ready):

5. **Kubernetes-based**:
   - Each API is a pod
   - Auto-scaling
   - Health checks
   - Service mesh

6. **Serverless Functions**:
   - AWS Lambda / Google Cloud Functions
   - True per-request isolation
   - Automatic scaling

---

## Immediate Action Items

To fix the **422 error** with file uploads:

1. Replace `TestClient` with actual HTTP proxy using `httpx`
2. Parse `request.form()` properly in gateway
3. Reconstruct multipart request for user API
4. Ensure Content-Type headers are preserved

To fix **dependency conflicts**:

1. Run each API in isolated subprocess
2. Allow per-API `requirements.txt` stored in database
3. Install dependencies in separate virtualenvs

---

## Database Schema Reference

**APIs Table** (`code_snapshot` column):
- Stores complete Python code as text
- Currently includes all imports, FastAPI app definition
- No dependency specification stored separately

**Potential Addition**:
```sql
ALTER TABLE apis ADD COLUMN requirements TEXT;
-- Store pip requirements for each API
```

---

## Summary

**Current State**: Single-process, shared-dependency architecture using `exec()` and `TestClient`

**Main Problems**:
1. File uploads don't proxy correctly through `TestClient`
2. No dependency isolation between user APIs
3. Security and resource isolation concerns

**Recommended Next Step**:
Replace `TestClient` with `httpx` proxy and properly parse/forward multipart data to fix immediate 422 errors.
