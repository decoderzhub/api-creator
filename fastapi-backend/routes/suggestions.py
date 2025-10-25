"""
AI Suggestions Routes
Handles AI-powered prompt suggestions
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict
import sys
import os
import anthropic

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import get_settings
from .auth import verify_token

router = APIRouter()
settings = get_settings()


class SuggestPromptsRequest(BaseModel):
    apiName: str
    partialPrompt: str


class SuggestAboutRequest(BaseModel):
    apiName: str
    partialPrompt: str


@router.post("/suggest-prompts")
async def suggest_prompts(request: SuggestPromptsRequest, user_id: str = Depends(verify_token)):
    """Generate AI-powered prompt suggestions using Anthropic Claude"""
    try:
        print(f"[SUGGESTIONS] API Name: {request.apiName}")
        print(f"[SUGGESTIONS] Partial Prompt Length: {len(request.partialPrompt)} chars")
        print(f"[SUGGESTIONS] Partial Prompt: {request.partialPrompt[:100]}...")

        if not settings.anthropic_api_key:
            print("[SUGGESTIONS] No Anthropic API key, using fallback")
            return get_fallback_suggestions(request.apiName, request.partialPrompt)

        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

        system_prompt = """You are an expert API designer. Given an API name and partial description, suggest 3 complete, concise API descriptions that:
1. Are exactly 5-6 words each
2. Are production-ready and specific
3. Describe the core functionality
4. Build upon what the user has started typing

Return ONLY a JSON array of 3 strings, nothing else. Each string must be 5-6 words. Example format:
["Real-time weather data for cities", "Get stock prices and trends", "Send email notifications with templates"]"""

        user_prompt = f"""API Name: {request.apiName or 'Unnamed API'}
Partial Description: {request.partialPrompt or 'No description yet'}

Suggest 3 complete API descriptions:"""

        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=800,
            messages=[
                {"role": "user", "content": f"{system_prompt}\n\n{user_prompt}"}
            ]
        )

        content = message.content[0].text.strip()
        print(f"[SUGGESTIONS] AI Response: {content[:200]}...")

        try:
            import json
            suggestions = json.loads(content)
            print(f"[SUGGESTIONS] Parsed {len(suggestions)} suggestions successfully")
        except Exception as parse_error:
            print(f"[SUGGESTIONS] JSON parse failed: {parse_error}, trying fallback parsing")
            import re
            lines = content.split('\n')
            suggestions = [re.sub(r'^[0-9.\-*]\s*', '', line.strip().strip('"').strip("'")) for line in lines if line.strip()][:3]
            print(f"[SUGGESTIONS] Fallback parsed {len(suggestions)} suggestions")

        if not suggestions or len(suggestions) == 0:
            print("[SUGGESTIONS] No suggestions generated, using fallback")
            return get_fallback_suggestions(request.apiName, request.partialPrompt)

        return {"suggestions": suggestions[:3]}

    except Exception as e:
        print(f"Anthropic API error: {str(e)}")
        return get_fallback_suggestions(request.apiName, request.partialPrompt)


@router.post("/suggest-about")
async def suggest_about(request: SuggestAboutRequest, user_id: str = Depends(verify_token)):
    """Generate AI-powered about section suggestions for marketplace"""
    try:
        if not settings.anthropic_api_key:
            return get_fallback_about_suggestions(request.apiName, request.partialPrompt)

        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

        system_prompt = """You are writing marketplace descriptions for APIs. Given an API name and description, suggest 3 concise "about" descriptions that:
1. Are exactly 5-6 words each
2. Are user-friendly and appealing
3. Highlight the core value proposition
4. Are compelling for potential users

Return ONLY a JSON array of 3 strings, nothing else. Each string must be 5-6 words. Example format:
["Real-time weather for any city", "Track stock prices and trends", "Send automated email notifications instantly"]"""

        user_prompt = f"""API Name: {request.apiName or 'Unnamed API'}
API Description: {request.partialPrompt or 'No description yet'}

Suggest 3 marketplace-ready "about" descriptions:"""

        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=500,
            messages=[
                {"role": "user", "content": f"{system_prompt}\n\n{user_prompt}"}
            ]
        )

        content = message.content[0].text.strip()

        try:
            import json
            suggestions = json.loads(content)
        except:
            import re
            lines = content.split('\n')
            suggestions = [re.sub(r'^[0-9.\-*]\s*', '', line.strip().strip('"').strip("'")) for line in lines if line.strip()][:3]

        if not suggestions or len(suggestions) == 0:
            return get_fallback_about_suggestions(request.apiName, request.partialPrompt)

        return {"suggestions": suggestions[:3]}

    except Exception as e:
        print(f"Anthropic API error: {str(e)}")
        return get_fallback_about_suggestions(request.apiName, request.partialPrompt)


def get_fallback_about_suggestions(api_name: str, partial_prompt: str) -> Dict[str, List[str]]:
    """Fallback about suggestions when AI is unavailable"""
    context = (api_name + ' ' + partial_prompt).lower()

    if 'weather' in context:
        return {"suggestions": [
            'Get real-time weather data and forecasts for any city worldwide. Perfect for building weather apps and dashboards.',
            'Send automated weather alerts based on temperature, conditions, or storm warnings. Ideal for agricultural and logistics applications.',
            'Access historical weather data and climate trends for data analysis and research projects.',
        ]}
    elif 'notification' in context or 'alert' in context:
        return {"suggestions": [
            'Send notifications across email, SMS, and push channels with template support and delivery tracking.',
            'Manage notification preferences and subscriptions with granular user controls and GDPR compliance.',
            'Process webhooks and trigger smart notifications based on custom rules and conditions.',
        ]}
    else:
        return {"suggestions": [
            'A production-ready API with authentication, rate limiting, and comprehensive error handling.',
            'Build scalable applications with this fully-featured API supporting real-time updates and webhooks.',
            'Enterprise-grade API with detailed analytics, monitoring, and automatic documentation.',
        ]}


def get_fallback_suggestions(api_name: str, partial_prompt: str) -> Dict[str, List[str]]:
    """Fallback suggestions when AI is unavailable"""
    context = (api_name + ' ' + partial_prompt).lower()

    if 'weather' in context:
        return {"suggestions": [
            'An API that fetches real-time weather data for any city with temperature, humidity, wind speed, and 7-day forecast. Includes caching, rate limiting, and supports multiple weather providers.',
            'An API that sends weather alerts and notifications when specific conditions are met (temperature thresholds, storm warnings). Features webhooks, email/SMS integration, and customizable alert rules.',
            'An API that provides historical weather data and climate trends for agricultural planning and research. Offers data export in CSV/JSON, aggregation by time periods, and statistical analysis.',
        ]}
    elif 'notification' in context or 'alert' in context:
        return {"suggestions": [
            'An API that sends multi-channel notifications (email, SMS, push) with template support, scheduling, and delivery tracking. Includes retry logic, bounce handling, and detailed analytics.',
            'An API that manages notification preferences and subscriptions with granular control. Features user opt-in/opt-out, frequency capping, and compliance with GDPR and CAN-SPAM.',
            'An API that processes webhook events and triggers notifications based on custom rules. Supports payload transformation, conditional routing, and integration with major platforms.',
        ]}
    elif 'payment' in context or 'billing' in context:
        return {"suggestions": [
            'An API that processes credit card payments securely with PCI compliance, fraud detection, and 3D Secure support. Features automatic receipts, refund handling, and webhook notifications.',
            'An API that manages subscription billing with automatic renewals, prorated charges, and invoice generation. Includes dunning management, payment retry logic, and customer portal integration.',
            'An API that handles multi-currency payments with automatic conversion, local payment methods, and tax calculation. Features settlement reporting, dispute management, and reconciliation tools.',
        ]}
    elif 'user' in context or 'auth' in context:
        return {"suggestions": [
            'An API for user authentication with JWT tokens, refresh tokens, and session management. Includes password hashing, rate limiting, two-factor authentication, and OAuth2 integration.',
            'An API that manages user profiles with avatar upload, preference storage, and activity logging. Features data validation, privacy controls, GDPR compliance, and account deletion.',
            'An API for user registration with email verification, password reset, and social login. Includes role-based access control, audit logs, and integration with identity providers.',
        ]}
    elif 'email' in context:
        return {"suggestions": [
            'An API that sends transactional emails with HTML templates, variable substitution, and attachment support. Features bounce handling, delivery tracking, and unsubscribe management.',
            'An API that manages email campaigns with segmentation, A/B testing, and scheduling. Includes analytics, click tracking, conversion metrics, and compliance with anti-spam regulations.',
            'An API that validates email addresses with syntax checking, domain verification, and disposable email detection. Features bulk validation, real-time API, and detailed quality scores.',
        ]}
    else:
        return {"suggestions": [
            'An API with full CRUD operations for managing resources with pagination, filtering, and sorting. Includes input validation, error handling, rate limiting, and comprehensive documentation.',
            'An API that provides real-time updates using WebSockets with authentication and reconnection logic. Features event subscriptions, message queuing, and horizontal scaling support.',
            'An API with advanced search capabilities using full-text search, faceted filtering, and relevance scoring. Includes caching, performance optimization, and analytics on search patterns.',
        ]}
