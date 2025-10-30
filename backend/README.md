# FastAPI Gateway Service

Dynamic API gateway that loads and executes user-generated APIs.

## Architecture

This service:
1. Loads user API code from Supabase database
2. Creates isolated execution contexts for each API
3. Routes incoming requests to the correct user API
4. Tracks usage and logs metrics

## Setup

### Local Development

1. Copy environment file:
```bash
cp .env.example .env
```

2. Update `.env` with your Supabase credentials

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Run the server:
```bash
python main.py
```

The gateway will be available at `http://localhost:8000`

### Docker Development

1. Ensure `.env` file exists in the project root

2. Start the services:
```bash
docker-compose up -d
```

3. View logs:
```bash
docker-compose logs -f fastapi-gateway
```

4. Stop services:
```bash
docker-compose down
```

## Usage

### API Request Format

User APIs are accessed via:
```
http://localhost:8000/{api_id}/{endpoint_path}
```

Example:
```bash
curl -X GET "http://localhost:8000/abc123/health" \
  -H "Authorization: Bearer your_api_key"
```

### Admin Endpoints

Reload all APIs:
```bash
curl -X POST "http://localhost:8000/admin/reload" \
  -H "Authorization: Bearer admin-secret-key"
```

Reload single API:
```bash
curl -X POST "http://localhost:8000/admin/reload/abc123" \
  -H "Authorization: Bearer admin-secret-key"
```

## How It Works

1. **Startup**: Gateway loads all active APIs from Supabase
2. **Request**: Client sends request with API key
3. **Validation**: Gateway validates API key against database
4. **Routing**: Request is routed to the loaded API handler
5. **Execution**: User's code executes in isolated context
6. **Logging**: Usage metrics are logged to database
7. **Response**: Result returned to client

## Security

- API keys required for all user API requests
- Admin API key for management endpoints
- Code execution in isolated namespaces
- Resource limits (execution time, memory)
- Request size limits

## Production Deployment

### Cloud Run (Google Cloud)

```bash
gcloud run deploy api-builder-gateway \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars SUPABASE_URL=$SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
```

### AWS ECS / Fargate

1. Build and push Docker image to ECR
2. Create ECS task definition
3. Deploy as ECS service with environment variables

### Kubernetes

```bash
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
```

## Monitoring

- Health check: `GET /health`
- Metrics: API load count, request rates
- Logs: stdout/stderr for container logs

## Future Enhancements

- [ ] Full FastAPI sub-app mounting for complete API execution
- [ ] WebSocket support for user APIs
- [ ] Rate limiting per API and per plan
- [ ] Caching with Redis
- [ ] Auto-scaling based on load
- [ ] API versioning support
- [ ] Custom domain support per API
