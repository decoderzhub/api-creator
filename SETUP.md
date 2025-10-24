# AI API Builder - Complete Setup Guide

## Overview
This platform allows users to generate, deploy, and manage APIs using natural language. It consists of three main components:

1. **Frontend** (React + Vite + Supabase)
2. **Supabase Backend** (Database + Edge Functions)
3. **FastAPI Gateway** (Dynamic API loader and router)

## Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- Supabase account (free tier works)
- Python 3.11+ (for local FastAPI development)

## Step 1: Environment Setup

### 1.1 Copy Environment File

```bash
cp .env.example .env
```

### 1.2 Configure Environment Variables

Edit `.env` with your actual values:

```env
# Supabase Configuration (from your Supabase project settings)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# FastAPI Gateway URL
VITE_FASTAPI_GATEWAY_URL=http://localhost:8000

# Admin API Key (generate a secure random string)
ADMIN_API_KEY=your-secure-admin-key-here
```

### 1.3 Get Supabase Credentials

1. Go to https://supabase.com/dashboard
2. Create a new project (or use existing)
3. Navigate to Settings > API
4. Copy:
   - Project URL → `VITE_SUPABASE_URL`
   - Anon public key → `VITE_SUPABASE_ANON_KEY`
   - Service role key → `SUPABASE_SERVICE_ROLE_KEY`

## Step 2: Database Setup

The database migrations are already created. They will be applied automatically by Supabase.

### Verify Migrations

1. Go to Supabase Dashboard > Database > Migrations
2. Confirm these migrations are applied:
   - `create_initial_schema.sql` - Creates all tables
   - `create_user_profile_trigger.sql` - Auto-creates user profiles

### Manual Migration (if needed)

If migrations aren't auto-applied, run them manually in the SQL Editor:

```sql
-- Run the contents of:
-- supabase/migrations/20251024002151_create_initial_schema.sql
-- supabase/migrations/20251024123411_create_user_profile_trigger.sql
```

## Step 3: Edge Functions Deployment

Edge Functions are already deployed. To verify or redeploy:

### Check Deployed Functions

In Supabase Dashboard > Edge Functions, you should see:
- `generate-api-code` - Generates FastAPI code
- `marketplace` - Manages marketplace operations
- `api-analytics` - Tracks API usage
- `deploy-api` - Deploys APIs to FastAPI gateway

## Step 4: FastAPI Gateway Setup

### Option A: Docker (Recommended)

```bash
# Build and start the FastAPI gateway
docker-compose up -d fastapi-gateway

# View logs
docker-compose logs -f fastapi-gateway

# Stop
docker-compose down
```

The gateway will be available at `http://localhost:8000`

### Option B: Local Python

```bash
# Navigate to FastAPI backend
cd fastapi-backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Edit .env with your credentials

# Run the server
python main.py
```

### Verify FastAPI Gateway

```bash
# Health check
curl http://localhost:8000/health

# Should return:
# {"status":"healthy","loaded_apis":0,...}
```

## Step 5: Frontend Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:5173`

## Step 6: Test the Complete System

### 6.1 Create an Account

1. Navigate to http://localhost:5173
2. Click "Get Started" or "Sign Up"
3. Create an account with email/password
4. You should be redirected to the dashboard

### 6.2 Generate Your First API

1. Navigate to "Generate" page
2. Enter API name: `My Test API`
3. Enter description: `An API that returns a greeting message`
4. Click "Generate API"
5. Wait for deployment (should take 5-10 seconds)
6. Copy the endpoint URL and API key

### 6.3 Test Your Generated API

```bash
# Replace with your actual API ID and key
export API_ID="your-api-id"
export API_KEY="your-api-key"

# Test the API
curl -X GET "http://localhost:8000/${API_ID}/" \
  -H "Authorization: Bearer ${API_KEY}"

# Should return a success response
```

### 6.4 View Dashboard

1. Navigate to "Dashboard" page
2. You should see your API listed
3. Check usage statistics
4. Try deleting and recreating APIs

## Architecture Flow

```
User Browser
    ↓
React Frontend (localhost:5173)
    ↓
Supabase Edge Functions
    ↓
Supabase Database (PostgreSQL)
    ↓
FastAPI Gateway (localhost:8000)
    ↓
Dynamic User API Execution
```

## Troubleshooting

### Issue: Frontend can't connect to Supabase

**Solution:**
- Verify `.env` file has correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Restart the dev server: `npm run dev`

### Issue: FastAPI Gateway not loading APIs

**Solution:**
```bash
# Check gateway logs
docker-compose logs fastapi-gateway

# Manually reload APIs
curl -X POST "http://localhost:8000/admin/reload" \
  -H "Authorization: Bearer your-admin-key"
```

### Issue: API deployment fails

**Solution:**
- Check that FastAPI gateway is running
- Verify `VITE_FASTAPI_GATEWAY_URL` in `.env`
- Check Edge Function logs in Supabase Dashboard

### Issue: Database tables not created

**Solution:**
- Go to Supabase Dashboard > SQL Editor
- Run the migration files manually
- Check for error messages

## Production Deployment

### Frontend (Vercel/Netlify)

```bash
# Build for production
npm run build

# Deploy dist/ folder to Vercel or Netlify
# Configure environment variables in hosting platform
```

### FastAPI Gateway (Cloud Run/ECS/Railway)

```bash
# Build Docker image
docker build -t api-builder-gateway ./fastapi-backend

# Deploy to cloud platform
# Configure environment variables in cloud console
```

### Environment Variables for Production

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_FASTAPI_GATEWAY_URL=https://your-gateway.cloud.com
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ADMIN_API_KEY=secure-random-string
```

## Next Steps

1. **Add Authentication Features**
   - Password reset
   - Email verification
   - OAuth providers

2. **Enhance API Generation**
   - Use OpenAI API for better code generation
   - Support multiple frameworks (Express, Django)
   - Add code templates

3. **Implement Rate Limiting**
   - Per API rate limits
   - Per plan tier limits
   - DDoS protection

4. **Add Monitoring**
   - Error tracking (Sentry)
   - Performance monitoring
   - Usage analytics

5. **Marketplace Features**
   - API ratings and reviews
   - Monetization with Stripe
   - API documentation generation

## Support

For issues or questions:
- Check the ARCHITECTURE.md file
- Review FastAPI backend README.md
- Check Supabase Dashboard logs
- Review Docker container logs

## Security Notes

- Never commit `.env` files
- Rotate API keys regularly
- Use HTTPS in production
- Enable Supabase RLS policies
- Sanitize user-generated code before execution
- Implement rate limiting
- Monitor for abuse
