#!/bin/bash

echo "🚀 Starting AI API Builder Platform..."
echo ""

if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please copy .env.example to .env and configure your settings"
    exit 1
fi

echo "✅ Environment file found"
echo ""

echo "📦 Starting FastAPI Gateway with Docker..."
docker-compose up -d fastapi-gateway redis

echo ""
echo "⏳ Waiting for FastAPI Gateway to be ready..."
sleep 5

if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ FastAPI Gateway is running at http://localhost:8000"
else
    echo "⚠️  FastAPI Gateway might not be ready yet. Check logs with: docker-compose logs -f fastapi-gateway"
fi

echo ""
echo "🎨 Starting Frontend Development Server..."
npm run dev &

echo ""
echo "✨ Platform is starting up!"
echo ""
echo "📍 Services:"
echo "   - Frontend:          http://localhost:5173"
echo "   - FastAPI Gateway:   http://localhost:8000"
echo "   - Supabase:          https://efdeigbvozquuwtmiymw.supabase.co"
echo ""
echo "📚 View logs:"
echo "   - FastAPI: docker-compose logs -f fastapi-gateway"
echo "   - Frontend: (shown in this terminal)"
echo ""
echo "🛑 To stop all services:"
echo "   - Press Ctrl+C to stop frontend"
echo "   - Run: docker-compose down"
echo ""

wait
