# Auto-Troubleshooting System

## Overview

The API Creator platform now includes an AI-powered automatic troubleshooting system that can detect, diagnose, and fix container failures without manual intervention.

## How It Works

### 1. **Automatic Detection**
When you're on the API Playground page, the system automatically detects when a container is failing:
- Container status: `restarting`, `exited`, or `error`
- Displays a yellow warning card at the top of the page

### 2. **One-Click Auto-Fix**
Click the **"Auto-Fix with AI"** button to trigger the automated repair process:

#### Step 1: Analyzing (33%)
- Fetches the last 200 lines of container logs
- Retrieves diagnostic information from Docker

#### Step 2: Fixing (66%)
- Sends logs + original code + original prompt to Claude AI
- AI analyzes the error and generates fixed code
- Common fixes include:
  - Missing imports (BytesIO, json, uuid, minio)
  - Environment variable issues
  - MinIO connection errors
  - Type conversion errors
  - File handling bugs

#### Step 3: Deploying (100%)
- Updates the API code in the database
- Triggers a redeployment
- Waits for container to become healthy

### 3. **Success Confirmation**
When successful:
- Green checkmark appears
- Message: "Container fixed and redeployed successfully!"
- Diagnostics refresh automatically
- Your API should now be working

## Backend Architecture

### API Endpoints

#### `/api/diagnose-api/{api_id}` (GET)
Returns detailed container diagnostics:
```json
{
  "success": true,
  "apiId": "xxx",
  "diagnosis": {
    "status": "restarting",
    "logs": "...",
    "port": 9839,
    "exit_code": 1,
    "error": "Container exited unexpectedly"
  }
}
```

#### `/api/container-logs/{api_id}?tail=100` (GET)
Fetches container logs:
```json
{
  "success": true,
  "apiId": "xxx",
  "logs": "INFO: Starting...\nERROR: NameError: name 'BytesIO' is not defined"
}
```

#### `/api/troubleshoot-api` (POST)
AI-powered code fixing:
```json
{
  "apiId": "xxx",
  "originalCode": "...",
  "originalPrompt": "...",
  "errorLogs": "..."
}

Response:
{
  "fixed_code": "...",
  "language": "python",
  "framework": "fastapi"
}
```

### AI Troubleshooting Prompt

The AI analyzes errors with these patterns:

**Common Issues Detected:**
1. Missing imports → Adds at top of file
2. Environment variables → Includes with defaults
3. MinIO errors → Wraps in try/except
4. File storage → Converts from local disk to MinIO
5. Type errors → Adds proper conversions

**Example Fix Pattern:**
```python
# BEFORE (broken)
from fastapi import FastAPI
image.save(buffer, format='JPEG')
public_url = f"http://localhost:8000/..."

# AFTER (fixed by AI)
from fastapi import FastAPI
from io import BytesIO
import os
import json

PUBLIC_HOSTNAME = os.getenv("PUBLIC_HOSTNAME", "localhost:8000")
MINIO_PUBLIC_URL = os.getenv("MINIO_PUBLIC_URL", "https://minio.systemd.diskstation.me")

buffer = BytesIO()
image.save(buffer, format='JPEG')
public_url = f"{MINIO_PUBLIC_URL}/user-uploads/{filename}"
```

## Frontend Components

### ContainerTroubleshooter Component

Located at: `src/components/dashboard/ContainerTroubleshooter.tsx`

**Features:**
- Auto-detects failing containers
- Shows progress bar during fix (3 stages)
- Displays container logs
- Handles success/error states
- Refreshes diagnostics after fix

**Props:**
```typescript
interface ContainerTroubleshooterProps {
  apiId: string;
  apiName: string;
  originalCode: string;
  originalPrompt: string;
  containerStatus?: string;
  onFixApplied?: () => void;
}
```

**States:**
- `idle` - Waiting for user action
- `analyzing` - Fetching logs and diagnostics
- `fixing` - AI generating fixed code
- `deploying` - Redeploying with fixed code
- `success` - Fix applied successfully
- `error` - Fix failed with error message

## Enhanced AI Generation

### Hostname Configuration
All generated APIs now use environment variables for URLs:
```python
PUBLIC_HOSTNAME = os.getenv("PUBLIC_HOSTNAME", "localhost:8000")
API_ID = os.getenv("API_ID", "")
MINIO_PUBLIC_URL = os.getenv("MINIO_PUBLIC_URL", "https://minio.systemd.diskstation.me")

# URLs in responses
image_url = f"{MINIO_PUBLIC_URL}/user-uploads/{filename}"
api_endpoint = f"https://{PUBLIC_HOSTNAME}/run/{API_ID}/your-path"
```

### Mandatory MinIO Storage
The AI prompt now **mandates** MinIO for file storage:
- ❌ NEVER: `os.makedirs()`, `open(file, 'wb')`, `StaticFiles`
- ✅ ALWAYS: MinIO upload with public URLs

### Complete Example Provided
The prompt includes a full working example showing:
- MinIO client initialization
- Bucket creation with public policy
- File upload
- URL generation

## Configuration

### Environment Variables (Backend)
Add to `/backend/.env`:
```bash
PUBLIC_HOSTNAME=api-creator.systemd.diskstation.me
MINIO_ENDPOINT=minio.systemd.diskstation.me
MINIO_ACCESS_KEY=admin
MINIO_SECRET_KEY=minio123
MINIO_PUBLIC_URL=https://minio.systemd.diskstation.me
MINIO_SECURE=true
```

### Container Environment Variables
Automatically injected by `api_deployer.py`:
- `PUBLIC_HOSTNAME`
- `API_ID`
- `MINIO_ENDPOINT`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`
- `MINIO_PUBLIC_URL`
- `MINIO_SECURE`
- `FREESOUND_API_KEY`

## Usage Example

1. **User creates Image Resizer API**
2. **Container fails** with error: `NameError: name 'BytesIO' is not defined`
3. **Diagnostics show** container status: `restarting`
4. **Yellow warning card appears** at top of API Playground
5. **User clicks** "Auto-Fix with AI" button
6. **System automatically:**
   - Fetches container logs
   - Sends to Claude AI
   - AI identifies missing `from io import BytesIO`
   - Generates fixed code with proper imports
   - Updates database
   - Redeploys container
7. **Success!** Container status: `running`

## Manual Troubleshooting

If auto-fix fails, you can:
1. Click "View Logs" to see detailed error messages
2. Check diagnostics panel for container status
3. Click "Try Again" to retry the fix
4. Manually edit code in Dashboard if needed

## Benefits

✅ **Instant Error Resolution** - Fix container failures in seconds
✅ **No Manual Debugging** - AI analyzes and fixes code automatically
✅ **Learning System** - AI understands common patterns and fixes
✅ **User-Friendly** - One-click operation with progress feedback
✅ **Complete Logging** - Full visibility into what went wrong
✅ **Automatic Retry** - Easy to try again if first attempt fails

## Future Enhancements

Potential improvements:
- [ ] Auto-retry on deployment (attempt fix before showing error)
- [ ] Fix history tracking (learn from previous fixes)
- [ ] Pattern recognition (identify recurring errors)
- [ ] Proactive suggestions (warn before errors occur)
- [ ] Multi-language support (Node.js, Go, etc.)
