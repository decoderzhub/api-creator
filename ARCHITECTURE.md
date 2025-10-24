# AI API Builder - System Architecture

## Overview
This document describes the complete architecture for deploying and managing user-generated APIs.

## Architecture Layers

### 1. Frontend (React + Supabase)
- User interface for API generation
- Dashboard for managing APIs
- Marketplace for discovering APIs
- Direct connection to Supabase for auth and data

### 2. Supabase Backend
- **Database**: Stores users, APIs metadata, usage logs, marketplace listings
- **Edge Functions**: Platform operations (code generation, marketplace, analytics)
- **Auth**: User authentication and authorization

### 3. FastAPI Gateway Service
- **Purpose**: Central API gateway that routes requests to user APIs
- **Responsibilities**:
  - Request routing based on API keys
  - Authentication and rate limiting
  - Usage tracking
  - Load balancing across API instances

### 4. FastAPI Dynamic Loader Service
- **Purpose**: Dynamically loads and executes user-generated API code
- **Responsibilities**:
  - Loads Python code from database
  - Creates isolated execution contexts
  - Manages API lifecycle (start, stop, reload)
  - Hot-swapping of API code without restarts

### 5. Container Orchestration (Docker)
- **Purpose**: Isolated execution environments for user APIs
- **Options**:
  - **Development**: Docker Compose with shared FastAPI service
  - **Production**: Kubernetes, Cloud Run, or ECS for scaling

## Request Flow

```
User Request
    ↓
[Edge Function: API Gateway]
    ↓ (validate API key, log usage)
[Supabase: Check API metadata]
    ↓
[FastAPI Gateway Service]
    ↓ (route to correct API)
[FastAPI Dynamic Loader]
    ↓ (execute user code)
Response ← User's API Code
```

## Deployment Flow

```
User Creates API
    ↓
[Frontend: Generate Page]
    ↓
[Edge Function: generate-api-code]
    ↓ (generate FastAPI code)
[Supabase: Store API + code]
    ↓
[Edge Function: deploy-api]
    ↓ (trigger deployment)
[FastAPI Deployment Service]
    ↓ (load code, start container)
API Ready ✓
```

## Data Flow

### API Metadata (Supabase)
```sql
apis {
  id, user_id, name, prompt,
  endpoint_url,  -- https://gateway.apibuilder.dev/{api_id}
  api_key,       -- Authentication token
  code_snapshot, -- Generated FastAPI code
  container_id,  -- Docker container ID (if isolated)
  status         -- active, paused, deploying, failed
}
```

### Runtime State (FastAPI Service)
- In-memory API registry
- Loaded code modules
- Request routing table
- Performance metrics

## Security Considerations

1. **Code Isolation**: Each user's API code runs in isolated namespace
2. **Resource Limits**: CPU, memory, and request limits per API
3. **API Key Validation**: Every request requires valid API key
4. **Rate Limiting**: Configurable per plan tier
5. **Sandboxing**: Restricted imports and system access

## Scaling Strategy

### Phase 1: Single FastAPI Instance
- All user APIs run in one FastAPI service
- Dynamic code loading
- Suitable for MVP and low-medium traffic

### Phase 2: Container per API
- Each API gets its own Docker container
- Better isolation and resource management
- Scales to hundreds of APIs

### Phase 3: Kubernetes/Cloud Run
- Auto-scaling based on traffic
- Multi-region deployment
- Handles thousands of APIs

## Technology Stack

- **Frontend**: React + TypeScript + Vite
- **Database**: Supabase (PostgreSQL)
- **Edge Functions**: Supabase Edge Functions (Deno)
- **API Backend**: FastAPI (Python 3.11+)
- **Container**: Docker
- **Orchestration**: Docker Compose → Kubernetes (future)
- **Deployment**: Manual → CI/CD (future)

## Development Setup

1. Start Supabase (already configured)
2. Run FastAPI Gateway: `docker-compose up fastapi-gateway`
3. Run Frontend: `npm run dev`
4. Deploy user API → automatically loaded into FastAPI service

## Production Deployment

1. Deploy Supabase project
2. Deploy FastAPI Gateway to Cloud Run / ECS
3. Configure environment variables
4. Enable auto-scaling
5. Set up monitoring and logging
