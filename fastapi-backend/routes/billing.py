"""
API routes for billing and Stripe payment processing.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Header, Request
from pydantic import BaseModel, Field
from typing import Optional, Literal
import os

import stripe
from supabase import create_client
from config import get_settings
from logger import logger

settings = get_settings()
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

router = APIRouter(prefix="/billing", tags=["billing"])


def get_supabase_client():
    """Get Supabase client instance"""
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


async def get_current_user(authorization: str = Header(None)) -> dict:
    """Extract and verify user from authorization header"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header"
        )

    token = authorization.replace("Bearer ", "")
    supabase = get_supabase_client()

    try:
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        return {"id": user_response.user.id, "email": user_response.user.email}
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed"
        )


class CreateCheckoutSessionRequest(BaseModel):
    """Request body for creating a Stripe checkout session."""
    price_id: str = Field(..., description="Stripe price ID")
    success_url: str = Field(..., description="URL to redirect on success")
    cancel_url: str = Field(..., description="URL to redirect on cancel")
    mode: Literal["payment", "subscription"] = Field(..., description="Payment mode")


class CheckoutSessionResponse(BaseModel):
    """Response containing checkout session details."""
    session_id: str
    url: str


@router.post("/create-checkout-session", response_model=CheckoutSessionResponse)
async def create_checkout_session(
    request: CreateCheckoutSessionRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a Stripe checkout session for upgrading to Pro.

    This endpoint:
    1. Gets or creates a Stripe customer
    2. Creates a checkout session
    3. Stores customer and subscription info in database
    """

    supabase = get_supabase_client()
    user_id = current_user["id"]
    user_email = current_user["email"]

    try:
        customer_response = supabase.table("stripe_customers").select("customer_id").eq("user_id", user_id).is_("deleted_at", None).maybeSingle().execute()

        customer_id = None

        if not customer_response.data or not customer_response.data.get("customer_id"):
            new_customer = stripe.Customer.create(
                email=user_email,
                metadata={"userId": user_id}
            )

            logger.info(f"Created new Stripe customer {new_customer.id} for user {user_id}")

            supabase.table("stripe_customers").insert({
                "user_id": user_id,
                "customer_id": new_customer.id
            }).execute()

            if request.mode == "subscription":
                supabase.table("stripe_subscriptions").insert({
                    "customer_id": new_customer.id,
                    "status": "not_started"
                }).execute()

            customer_id = new_customer.id
            logger.info(f"Successfully set up new customer {customer_id}")
        else:
            customer_id = customer_response.data["customer_id"]

            if request.mode == "subscription":
                subscription_response = supabase.table("stripe_subscriptions").select("status").eq("customer_id", customer_id).maybeSingle().execute()

                if not subscription_response.data:
                    supabase.table("stripe_subscriptions").insert({
                        "customer_id": customer_id,
                        "status": "not_started"
                    }).execute()

        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[{
                "price": request.price_id,
                "quantity": 1
            }],
            mode=request.mode,
            success_url=request.success_url,
            cancel_url=request.cancel_url
        )

        logger.info(f"Created checkout session {session.id} for customer {customer_id}")

        return CheckoutSessionResponse(
            session_id=session.id,
            url=session.url
        )

    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {str(e)}", extra={"user_id": user_id})
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stripe error: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Failed to create checkout session: {str(e)}", extra={"user_id": user_id})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create checkout session: {str(e)}"
        )


@router.post("/webhook")
async def stripe_webhook(request: Request):
    """
    Handle Stripe webhook events.

    This endpoint processes webhook events from Stripe to keep
    subscription and payment status in sync.
    """

    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    if not webhook_secret:
        logger.error("STRIPE_WEBHOOK_SECRET not configured")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook secret not configured"
        )

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not sig_header:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No signature found"
        )

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
    except ValueError:
        logger.error("Invalid webhook payload")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid payload"
        )
    except stripe.error.SignatureVerificationError:
        logger.error("Invalid webhook signature")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid signature"
        )

    supabase = get_supabase_client()
    stripe_data = event.get("data", {}).get("object", {})

    if not stripe_data or "customer" not in stripe_data:
        return {"received": True}

    customer_id = stripe_data.get("customer")

    if event["type"] == "payment_intent.succeeded" and stripe_data.get("invoice") is None:
        return {"received": True}

    if not customer_id or not isinstance(customer_id, str):
        logger.error(f"No valid customer ID in event: {event['type']}")
        return {"received": True}

    is_subscription = True

    if event["type"] == "checkout.session.completed":
        mode = stripe_data.get("mode")
        is_subscription = mode == "subscription"
        logger.info(f"Processing {'subscription' if is_subscription else 'one-time payment'} checkout session")

    if is_subscription:
        logger.info(f"Starting subscription sync for customer: {customer_id}")
        await sync_customer_subscription(customer_id, supabase)
    elif stripe_data.get("mode") == "payment" and stripe_data.get("payment_status") == "paid":
        try:
            supabase.table("stripe_orders").insert({
                "checkout_session_id": stripe_data.get("id"),
                "payment_intent_id": stripe_data.get("payment_intent"),
                "customer_id": customer_id,
                "amount_subtotal": stripe_data.get("amount_subtotal"),
                "amount_total": stripe_data.get("amount_total"),
                "currency": stripe_data.get("currency"),
                "payment_status": stripe_data.get("payment_status"),
                "status": "completed"
            }).execute()

            logger.info(f"Successfully processed one-time payment for session: {stripe_data.get('id')}")
        except Exception as e:
            logger.error(f"Error processing one-time payment: {str(e)}")

    return {"received": True}


async def sync_customer_subscription(customer_id: str, supabase):
    """Sync subscription data from Stripe to database."""

    try:
        subscriptions = stripe.Subscription.list(
            customer=customer_id,
            limit=1,
            status="all",
            expand=["data.default_payment_method"]
        )

        if not subscriptions.data:
            logger.info(f"No subscriptions found for customer: {customer_id}")
            supabase.table("stripe_subscriptions").upsert({
                "customer_id": customer_id,
                "status": "not_started"
            }, on_conflict="customer_id").execute()
            return

        subscription = subscriptions.data[0]
        price_id = subscription["items"]["data"][0]["price"]["id"]

        update_data = {
            "customer_id": customer_id,
            "subscription_id": subscription.id,
            "price_id": price_id,
            "current_period_start": subscription.current_period_start,
            "current_period_end": subscription.current_period_end,
            "cancel_at_period_end": subscription.cancel_at_period_end,
            "status": subscription.status
        }

        default_payment_method = subscription.default_payment_method
        if default_payment_method and isinstance(default_payment_method, stripe.PaymentMethod):
            if default_payment_method.card:
                update_data["payment_method_brand"] = default_payment_method.card.brand
                update_data["payment_method_last4"] = default_payment_method.card.last4

        supabase.table("stripe_subscriptions").upsert(
            update_data,
            on_conflict="customer_id"
        ).execute()

        # Determine plan tier based on price ID and update user's plan
        plan = "free"
        pro_price_id = os.getenv("STRIPE_PRO_PRICE_ID")
        enterprise_price_id = os.getenv("STRIPE_ENTERPRISE_PRICE_ID")

        if subscription.status == "active":
            if price_id == pro_price_id:
                plan = "pro"
            elif price_id == enterprise_price_id:
                plan = "enterprise"

            # Update user's plan in the users table
            customer_lookup = supabase.table("stripe_customers").select("user_id").eq("customer_id", customer_id).maybeSingle().execute()

            if customer_lookup.data:
                user_id = customer_lookup.data["user_id"]
                supabase.table("users").update({
                    "plan": plan,
                    "stripe_customer_id": customer_id
                }).eq("id", user_id).execute()
                logger.info(f"Updated user {user_id} to {plan} plan")
        elif subscription.status in ["canceled", "incomplete_expired", "unpaid"]:
            # Downgrade to free plan
            customer_lookup = supabase.table("stripe_customers").select("user_id").eq("customer_id", customer_id).maybeSingle().execute()

            if customer_lookup.data:
                user_id = customer_lookup.data["user_id"]
                supabase.table("users").update({"plan": "free"}).eq("id", user_id).execute()
                logger.info(f"Downgraded user {user_id} to free plan")

        logger.info(f"Successfully synced subscription for customer: {customer_id}")

    except Exception as e:
        logger.error(f"Failed to sync subscription for customer {customer_id}: {str(e)}")
        raise


@router.get("/subscription-status")
async def get_subscription_status(current_user: dict = Depends(get_current_user)):
    """Get the current user's subscription status."""

    supabase = get_supabase_client()
    user_id = current_user["id"]

    try:
        customer_response = supabase.table("stripe_customers").select("customer_id").eq("user_id", user_id).is_("deleted_at", None).maybeSingle().execute()

        if not customer_response.data:
            return {
                "has_subscription": False,
                "status": "none",
                "plan": "free"
            }

        customer_id = customer_response.data["customer_id"]

        subscription_response = supabase.table("stripe_subscriptions").select("*").eq("customer_id", customer_id).maybeSingle().execute()

        if not subscription_response.data or subscription_response.data.get("status") in ["not_started", "canceled", "incomplete_expired"]:
            return {
                "has_subscription": False,
                "status": subscription_response.data.get("status", "none") if subscription_response.data else "none",
                "plan": "free"
            }

        subscription_data = subscription_response.data

        return {
            "has_subscription": True,
            "status": subscription_data.get("status"),
            "plan": "pro",
            "current_period_end": subscription_data.get("current_period_end"),
            "cancel_at_period_end": subscription_data.get("cancel_at_period_end", False)
        }

    except Exception as e:
        logger.error(f"Failed to get subscription status: {str(e)}", extra={"user_id": user_id})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve subscription status"
        )
