# AI API Builder

A SaaS platform that allows users to generate, deploy, and manage production-ready APIs using natural language descriptions.

## Features

- **AI-Powered Generation**: Describe your API in plain English and get production-ready FastAPI code
- **Instant Deployment**: APIs are automatically deployed and ready to use in seconds
- **Dashboard Management**: View, manage, and track all your APIs from a unified dashboard
- **Usage Analytics**: Real-time analytics, performance metrics, and usage tracking
- **API Marketplace**: Publish and monetize your APIs in our growing marketplace
- **Secure by Default**: Built-in authentication, rate limiting, and industry-standard security

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite for fast development
- Tailwind CSS for styling
- Framer Motion for animations
- React Router for navigation

### Backend
- Supabase (PostgreSQL database + Auth + Edge Functions)
- FastAPI gateway for dynamic API loading
- Docker for containerization
- Python 3.11+

## Quick Start

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- Supabase account

### 1. Clone and Install

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials (see SETUP.md for details)

### 3. Start Everything

```bash
./start.sh
```

Or manually:

```bash
docker-compose up -d fastapi-gateway
npm run dev
```

### 4. Access the Platform

- Frontend: http://localhost:5173
- FastAPI Gateway: http://localhost:8000
- Supabase Dashboard: Your Supabase project URL

## Documentation

- **[SETUP.md](./SETUP.md)** - Complete setup guide with troubleshooting
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture and design decisions
- **[fastapi-backend/README.md](./fastapi-backend/README.md)** - FastAPI gateway documentation

## How It Works

1. **User Creates API**: Describes what they want in natural language
2. **Code Generation**: Edge Function generates FastAPI code
3. **Database Storage**: API metadata and code stored in Supabase
4. **Deployment**: API loaded into FastAPI gateway
5. **Ready to Use**: User gets endpoint URL and API key
6. **Request Routing**: Gateway routes requests to user's API code
7. **Analytics**: All requests tracked for analytics

## Project Structure

```
.
├── src/                      # Frontend React application
│   ├── components/          # Reusable UI components
│   ├── contexts/            # React contexts (Auth, Theme)
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Libraries and utilities
│   ├── pages/               # Page components
│   └── main.tsx             # Entry point
├── fastapi-backend/         # FastAPI gateway service
│   ├── main.py              # Main gateway application
│   ├── api_loader.py        # Dynamic API loader
│   ├── auth.py              # Authentication utilities
│   ├── config.py            # Configuration management
│   └── Dockerfile           # Docker configuration
├── supabase/
│   ├── functions/           # Edge Functions
│   └── migrations/          # Database migrations
├── docker-compose.yml       # Docker services configuration
├── ARCHITECTURE.md          # Architecture documentation
├── SETUP.md                 # Setup guide
└── start.sh                 # Quick start script
```

## Development

### Run Frontend Only

```bash
npm run dev
```

### Run FastAPI Gateway Only

```bash
cd fastapi-backend
pip install -r requirements.txt
python main.py
```

### Build for Production

```bash
npm run build
```

### Run Tests

```bash
npm run lint
npm run typecheck
```

## Deployment

### Frontend (Vercel/Netlify)
1. Build: `npm run build`
2. Deploy `dist/` folder
3. Set environment variables

### FastAPI Gateway (Cloud Run/ECS)
1. Build Docker image: `docker build -t api-builder ./fastapi-backend`
2. Push to registry
3. Deploy to cloud platform
4. Set environment variables

See SETUP.md for detailed production deployment instructions.

## Features Roadmap

- [ ] OpenAI integration for better code generation
- [ ] Support for multiple frameworks (Express, Django, Flask)
- [ ] WebSocket support in generated APIs
- [ ] Custom domain support
- [ ] API versioning
- [ ] Stripe integration for marketplace monetization
- [ ] Rate limiting per API and plan tier
- [ ] API documentation auto-generation
- [ ] Team collaboration features
- [ ] API templates library

## Security

- Row Level Security (RLS) enabled on all Supabase tables
- API key authentication for all user APIs
- Isolated execution contexts for user code
- Rate limiting (planned)
- HTTPS in production
- Input sanitization
- Resource limits on API execution

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues, questions, or feature requests:
- Check the documentation (SETUP.md, ARCHITECTURE.md)
- Review existing issues
- Create a new issue with detailed information

## Acknowledgments

- Built with Supabase for backend infrastructure
- FastAPI for dynamic API gateway
- React and Vite for modern frontend development
- Tailwind CSS for beautiful UI design
