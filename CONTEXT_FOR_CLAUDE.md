# API-Creator Application - Complete Context

## Overview

API-Creator is a SaaS platform that allows users to generate, deploy, and manage production-ready APIs using natural language descriptions. Users describe what they want in plain English, and the platform generates FastAPI code, deploys it automatically, and provides a complete management dashboard.

## Architecture

### Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite for development
- Tailwind CSS for styling
- Framer Motion for animations
- React Router for navigation
- Sentry for error tracking

**Backend:**
- Supabase (PostgreSQL database + Auth)
- FastAPI Gateway for dynamic API loading
- Python 3.11+
- Docker for containerization
- Anthropic Claude API for code generation

**Infrastructure:**
- Supabase for database and authentication
- FastAPI gateway running in Docker
- User-generated APIs loaded dynamically into gateway

### System Flow

1. **User Creates API**: User describes API in natural language via web interface
2. **Code Generation**: Backend calls Anthropic Claude API to generate FastAPI code
3. **Storage**: Generated code saved to database (Supabase)
4. **Deployment**: FastAPI gateway dynamically loads the API into memory
5. **Access**: API becomes immediately available at `/{api_id}` endpoint
6. **Management**: User manages API via dashboard (pause, view code, analytics, etc.)

### Key Components

**FastAPI Gateway (`fastapi-backend/main.py`):**
- Main entry point that loads and routes to user-generated APIs
- Handles authentication, rate limiting, and usage tracking
- Dynamically loads Python code from database and executes it
- Routes requests like `GET /{api_id}` to the appropriate user API

**API Loader (`fastapi-backend/api_loader.py`):**
- Loads API code from Supabase database
- Uses `exec()` to dynamically create FastAPI apps from stored code
- Maintains in-memory cache of loaded APIs
- Supports hot-reloading of APIs

**Database Schema (Supabase):**

```
user_profiles:
  - id (uuid, pk)
  - email (text)
  - plan (text: free/pro/enterprise)
  - is_admin (boolean)
  - api_generation_count (int)
  - created_at, updated_at

apis:
  - id (uuid, pk)
  - user_id (uuid, fk)
  - name (text)
  - prompt (text) - original user description
  - description (text)
  - about (text) - detailed description for marketplace
  - code_snapshot (text) - generated FastAPI code
  - endpoint_url (text) - the /{api_id} endpoint
  - api_key (text) - for authenticating API calls
  - status (text: active/paused/failed)
  - is_published (boolean) - published to marketplace
  - usage_count (int)
  - created_at, updated_at

api_usage:
  - id (uuid, pk)
  - api_id (uuid, fk)
  - user_id (uuid)
  - status_code (int)
  - response_time_ms (int)
  - request_size_bytes (int)
  - created_at

marketplace_apis:
  - id (uuid, pk)
  - api_id (uuid, fk)
  - title (text)
  - description (text)
  - category (text)
  - price_per_call (decimal)
  - is_featured (boolean)
  - rating (decimal)
  - created_at

marketplace_reviews:
  - id (uuid, pk)
  - marketplace_api_id (uuid, fk)
  - user_id (uuid, fk)
  - rating (int)
  - comment (text)
  - created_at

saved_apis:
  - id (uuid, pk)
  - user_id (uuid, fk)
  - api_id (uuid, fk)
  - created_at

consumer_api_keys:
  - id (uuid, pk)
  - user_id (uuid, fk)
  - api_id (uuid, fk)
  - key_hash (text)
  - name (text)
  - created_at

rate_limit_usage:
  - id (uuid, pk)
  - user_id (uuid, fk)
  - request_count (int)
  - window_start (timestamp)
  - created_at

feedback:
  - id (uuid, pk)
  - user_id (uuid, fk)
  - type (text)
  - message (text)
  - status (text: pending/reviewed/resolved)
  - admin_response (text)
  - created_at, updated_at
```

## Key Features

### 1. AI-Powered API Generation

**Route:** `/api/generate` (POST)

**Flow:**
1. User enters natural language description (e.g., "Create an API that returns random cat facts")
2. Frontend sends prompt to backend
3. Backend calls Anthropic Claude API with system prompt
4. Claude generates complete FastAPI code
5. Code is validated and saved to database
6. API ID and key generated and returned to user
7. Gateway loads the API automatically

**Code Storage:**
- Full FastAPI code stored in `apis.code_snapshot`
- Includes imports, route definitions, error handling
- Can be viewed by user in dashboard

### 2. Dynamic API Loading

**How it works:**
- Gateway starts and loads all active APIs from database
- Uses `exec()` to execute stored Python code
- Creates FastAPI sub-applications for each user API
- Routes requests to appropriate API based on `/{api_id}` path
- APIs can be reloaded without restarting gateway

**Example user API code:**
```python
from fastapi import FastAPI

user_app = FastAPI()

@user_app.get("/")
def root():
    return {"message": "Hello from user API"}
```

### 3. Authentication & Authorization

**Two levels:**

**User Authentication (Supabase Auth):**
- Email/password authentication
- JWT tokens for session management
- Frontend uses `@supabase/supabase-js`
- Protected routes require valid session

**API Key Authentication:**
- Each generated API has unique API key
- Consumers call APIs with `Authorization: Bearer {api_key}` header
- Gateway validates key before routing request
- Keys stored hashed in database

### 4. Rate Limiting

**Implementation:**
- Per-user rate limits based on plan (free: 100/hr, pro: 1000/hr, enterprise: 10000/hr)
- Tracked in `rate_limit_usage` table
- Sliding window approach
- Returns 429 status when exceeded
- Rate limit info in response headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`)

### 5. Usage Analytics

**Dashboard (`/dashboard`):**
- Shows all user's APIs
- Request count per API
- Success/error rates
- Average response time
- Can pause/resume APIs
- View generated code
- Copy API endpoint and key

**Analytics Page:**
- Detailed usage over time
- Performance metrics
- Error tracking
- Top endpoints

### 6. Marketplace

**Features:**
- Users can publish APIs to marketplace
- Set price per API call
- Browse and discover APIs by category
- Save favorite APIs
- Rate and review APIs
- Generate consumer API keys for purchased APIs

**Flow:**
1. User clicks "Publish to Marketplace" on their API
2. Fills in title, description, category, pricing
3. API appears in marketplace (`/marketplace`)
4. Other users can browse and save the API
5. Generate API key to start using it

### 7. Monitoring & Observability

**Sentry Integration:**
- Error tracking for both frontend and backend
- Automatic exception capture
- Performance monitoring
- Session replay for errors

**Structured Logging:**
- JSON-formatted logs with timestamps
- Request correlation IDs (tracks request across services)
- Contextual information (user_id, api_id, etc.)
- Log levels: INFO, WARNING, ERROR

**Monitoring Dashboard (`/monitoring`):**

**For Regular Users:**
- Personal API usage statistics (24h/1h windows)
- Personal top APIs
- Gateway health status
- Error tracking for own APIs

**For Admin Users (is_admin = true):**
- System uptime, CPU, memory usage
- Total requests across all users
- System-wide error rates and response times
- All users' API usage
- Access to `/metrics` endpoint

**Health Checks:**
- `/health` - Gateway health and database connectivity
- `/metrics` - System metrics (admin only)
- Auto-refresh every 30 seconds

**Request Tracking:**
- Every request gets unique ID (`X-Request-ID` header)
- Process time in `X-Process-Time` header
- Full correlation through logs and Sentry

### 8. AI Assistant

**Features:**
- Floating chat widget on dashboard
- Helps users with API creation
- Provides code examples
- Suggests improvements
- Powered by Anthropic Claude

## API Routes

### Frontend Routes (React Router)

```
/                   - Landing page (or dashboard if logged in)
/login              - Login page
/signup             - Signup page
/generate           - API generation interface
/dashboard          - User's APIs dashboard
/marketplace        - Browse and discover APIs
/monitoring         - Monitoring dashboard (role-based)
/api-keys           - Manage consumer API keys
/billing            - Subscription management
/profile            - User profile settings
/feedback           - Submit feedback to admins
```

### Backend API Routes (FastAPI)

```
POST /api/generate              - Generate new API from description
POST /api/deploy                - Deploy generated API
GET  /api/api-analytics/{api_id} - Get API analytics
GET  /api/suggestions           - Get AI suggestions
POST /api/chat                  - AI assistant chat

GET  /api/marketplace/published - Get published APIs
GET  /api/marketplace/saved     - Get saved APIs
POST /api/marketplace/save      - Save an API
POST /api/marketplace/reviews   - Add review

GET  /api/rate-limit/usage      - Get rate limit usage

GET  /health                    - Health check (public)
GET  /metrics                   - System metrics (admin only)
POST /admin/reload              - Reload all APIs (admin only)
POST /admin/reload/{api_id}     - Reload single API (admin only)

GET  /{api_id}                  - Call user's API root
GET  /{api_id}/{path}           - Call user's API with path
POST /{api_id}                  - POST to user's API
PUT  /{api_id}/{path}           - PUT to user's API
DELETE /{api_id}/{path}         - DELETE to user's API
```

## Environment Variables

**Frontend (.env):**
```bash
VITE_SUPABASE_URL=              # Supabase project URL
VITE_SUPABASE_ANON_KEY=         # Supabase anon/public key
VITE_FASTAPI_GATEWAY_URL=       # FastAPI gateway URL
VITE_ADMIN_API_KEY=             # Admin API key for metrics
VITE_SENTRY_DSN=                # Sentry DSN for frontend (optional)
```

**Backend (fastapi-backend/.env):**
```bash
SUPABASE_URL=                   # Supabase project URL
SUPABASE_SERVICE_ROLE_KEY=      # Supabase service role key (full access)
ANTHROPIC_API_KEY=              # Anthropic API key for Claude
FREESOUND_API_KEY=              # Freesound API key (for audio APIs)
ADMIN_API_KEY=                  # Admin API key
GATEWAY_HOST=0.0.0.0
GATEWAY_PORT=8000
REDIS_URL=redis://redis:6379    # Optional
USE_REDIS=false                 # Optional
SENTRY_DSN=                     # Sentry DSN for backend (optional)
ENVIRONMENT=production          # production/staging/development
```

## Security Considerations

**Implemented:**
- Row Level Security (RLS) on all Supabase tables
- API keys hashed before storage
- Rate limiting per user
- Input validation on all endpoints
- CORS configured
- Authenticated-only routes
- Request size limits
- API execution timeout (30s default)

**Important Notes:**
- User-generated code is executed with `exec()` - this is inherently risky
- APIs run in same process as gateway (isolation needed for production)
- Admin API key should be rotated regularly
- Supabase service role key has full database access

## Development Workflow

**Setup:**
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd fastapi-backend
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your credentials

# Start backend
docker-compose up -d fastapi-gateway

# Start frontend
npm run dev
```

**Database Migrations:**
- Located in `supabase/migrations/`
- Applied via Supabase dashboard or CLI
- Include RLS policies and triggers

**Code Generation:**
- System prompt in `fastapi-backend/routes/generation.py`
- Claude generates complete FastAPI code
- Includes error handling and documentation

## Production Deployment

**Frontend:**
- Built with `npm run build`
- Static files in `dist/`
- Can deploy to Vercel, Netlify, etc.

**Backend:**
- Dockerized FastAPI application
- Runs on port 8000
- Needs access to Supabase
- Should be behind reverse proxy (nginx)

**Database:**
- Hosted on Supabase
- Automated backups
- Point-in-time recovery

**Monitoring:**
- Sentry for error tracking
- Custom monitoring dashboard
- Uptime monitoring (UptimeRobot recommended)

## Common Issues & Solutions

**API not loading:**
- Check `apis` table has `status = 'active'`
- Check code_snapshot is valid Python
- Check gateway logs for errors
- Use `/admin/reload/{api_id}` to reload

**Authentication issues:**
- Verify Supabase credentials
- Check JWT token expiration
- Ensure RLS policies are correct

**Rate limit issues:**
- Check `rate_limit_usage` table
- Verify user's plan tier
- Window resets every hour

**Monitoring shows "Invalid Date":**
- Fixed in v1.1 - health endpoint now properly returns ISO timestamp
- Frontend has fallback handling

## File Structure

```
/
├── src/                          # Frontend React app
│   ├── components/
│   │   ├── dashboard/           # Dashboard-specific components
│   │   ├── layout/              # Header, Sidebar, AIAssistant
│   │   └── ui/                  # Reusable UI components
│   ├── contexts/                # React contexts (Auth, Theme)
│   ├── hooks/                   # Custom React hooks
│   ├── lib/                     # Utilities and types
│   ├── pages/                   # Page components
│   └── main.tsx                 # Entry point
├── fastapi-backend/
│   ├── main.py                  # FastAPI gateway entry point
│   ├── api_loader.py            # Dynamic API loading logic
│   ├── auth.py                  # API key authentication
│   ├── config.py                # Configuration management
│   ├── rate_limiter.py          # Rate limiting logic
│   ├── logger.py                # Structured logging
│   ├── monitoring.py            # Sentry and metrics
│   ├── routes/                  # API route handlers
│   └── requirements.txt         # Python dependencies
├── supabase/
│   └── migrations/              # Database migrations
├── public/                      # Static assets
├── .env                         # Frontend environment variables
├── package.json                 # Node dependencies
├── vite.config.ts              # Vite configuration
├── tailwind.config.js          # Tailwind CSS config
└── docker-compose.yml          # Docker services

Documentation:
├── README.md                    # Project overview
├── SETUP.md                     # Setup instructions
├── ARCHITECTURE.md              # Architecture details
├── MONITORING_SETUP.md          # Monitoring guide
└── MONITORING_SUMMARY.md        # Monitoring summary
```

## Key Concepts

**API Lifecycle:**
1. Generated → Stored in DB → Loaded by Gateway → Available at endpoint
2. Can be paused (status='paused') - not accessible but not deleted
3. Can be deleted - removed from DB and unloaded from gateway
4. Can be published to marketplace - visible to other users

**User Plans:**
- Free: 100 requests/hour, basic features
- Pro: 1000 requests/hour, advanced features
- Enterprise: 10000 requests/hour, all features

**Admin vs Regular User:**
- Admins see system-wide data in monitoring dashboard
- Admins can access `/metrics` endpoint
- Regular users see only their own data
- Admin flag set in `user_profiles.is_admin`

**Request Flow:**
```
User → Frontend → FastAPI Gateway → Auth Check → Rate Limit Check
→ Load User API → Execute → Log Usage → Return Response
```

## Testing

**Test an API:**
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://gateway-url/{api_id}
```

**Check health:**
```bash
curl https://gateway-url/health
```

**Admin metrics:**
```bash
curl -H "Authorization: Bearer ADMIN_KEY" \
  https://gateway-url/metrics
```

## Future Enhancements

**Planned:**
- Billing integration (Stripe)
- API versioning
- Sandbox execution for user code
- WebSocket support
- API testing playground
- Collaborative APIs (teams)
- API templates library
- Enhanced rate limiting (per-API limits)

**Security Hardening Needed:**
- Isolate user API execution (containers/sandboxing)
- Code scanning for malicious patterns
- Resource limits per API (memory, CPU)
- Input sanitization improvements
- Secrets management for API keys

---

## Quick Reference

**Start the app:**
```bash
npm run dev                      # Frontend on :5173
docker-compose up -d             # Backend on :8000
```

**Common commands:**
```bash
npm run build                    # Build frontend
npm run lint                     # Lint code
cd fastapi-backend && pip install -r requirements.txt
```

**Admin access:**
```sql
UPDATE user_profiles SET is_admin = true
WHERE email = 'your@email.com';
```

**Current Version:** 1.1
**Production Ready:** ~85-90%
**Main Dependencies:** React 18, FastAPI, Supabase, Anthropic Claude, Sentry
