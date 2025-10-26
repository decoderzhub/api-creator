# Stripe Integration Setup Checklist

Your Stripe integration is now configured! Follow these steps to complete the setup:

## ✅ What's Already Done

1. **Frontend Integration** - The Billing page now properly communicates with your FastAPI backend
2. **Backend API Routes** - `/billing/create-checkout-session` and `/billing/webhook` endpoints are ready
3. **Database Tables** - `stripe_customers`, `stripe_subscriptions`, and `stripe_orders` tables exist
4. **Webhook Handler** - Automatically updates user plans when subscriptions are activated/canceled
5. **Error Handling** - Improved error messages and user feedback
6. **Success/Cancel Handling** - Toast notifications after checkout

## 📋 Steps to Complete

### 1. Update Backend Environment Variables

In your `fastapi-backend/.env` file, you should have:

```bash
STRIPE_SECRET_KEY=sk_test_...  # Your actual Stripe secret key
STRIPE_PRO_PRICE_ID=price_...  # The price ID you created
STRIPE_ENTERPRISE_PRICE_ID=price_...  # (Optional) Enterprise price ID
STRIPE_WEBHOOK_SECRET=whsec_...  # You'll get this in step 3
```

### 2. Test the Checkout Flow

1. Restart your FastAPI backend to load the new environment variables:
   ```bash
   cd fastapi-backend
   python main.py
   ```

2. In your browser, navigate to the Billing page
3. Click "Upgrade to Pro"
4. You should be redirected to Stripe Checkout
5. Use test card: `4242 4242 4242 4242` with any future date and CVC

### 3. Set Up Stripe Webhook (IMPORTANT!)

The webhook is what updates user plans after successful payment:

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Enter your webhook URL:
   ```
   https://api-creator.systemd.diskstation.me/api/billing/webhook
   ```
4. Select these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

5. Copy the "Signing secret" (starts with `whsec_`)
6. Add it to your backend `.env` as `STRIPE_WEBHOOK_SECRET`
7. Restart your backend

### 4. Test End-to-End

1. Create a test purchase with the test card
2. Complete the checkout
3. You should be redirected back to `/billing?success=true`
4. Check your database - the user's plan should be updated to "pro"
5. Verify in Stripe Dashboard that the webhook was received

### 5. Verify Webhook in Stripe Dashboard

After a test purchase:
1. Go to Stripe Dashboard → Webhooks
2. Click on your webhook endpoint
3. You should see successful events (200 responses)
4. If there are errors, check the response body and your backend logs

## 🧪 Testing with Stripe Test Mode

Stripe test cards:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`

Use any:
- Future expiry date (e.g., 12/34)
- Any 3-digit CVC
- Any ZIP code

## 🔍 Troubleshooting

### "Stripe is not configured" error
- Check that `VITE_STRIPE_PRO_PRICE_ID` in frontend `.env` is set to a real price ID (not placeholder)
- Verify the price ID exists in your Stripe dashboard

### Checkout creates but doesn't redirect
- Check browser console for errors
- Verify API_BASE_URL in frontend points to your backend

### Webhook not receiving events
- Verify webhook URL is publicly accessible
- Check that STRIPE_WEBHOOK_SECRET is set in backend `.env`
- Restart backend after adding webhook secret
- Check Stripe Dashboard → Webhooks for delivery attempts

### User plan not updating
- Verify webhook is receiving events (check Stripe Dashboard)
- Check backend logs for errors during webhook processing
- Ensure STRIPE_PRO_PRICE_ID in backend matches the price ID in Stripe
- Verify `stripe_customers` table has correct user_id → customer_id mapping

## 🚀 Going Live

When ready for production:

1. **Switch to Live Mode in Stripe Dashboard**
2. **Get Live Keys**:
   - Replace `sk_test_...` with `sk_live_...` in backend
   - Replace `price_test_...` with `price_...` (live price ID)
3. **Update Webhook**:
   - Create new webhook endpoint in Live mode
   - Update `STRIPE_WEBHOOK_SECRET` with live webhook secret
4. **Test thoroughly** with real card (small amount)
5. **Complete Stripe verification** (business info, identity, bank account)

## 📊 Monitoring Subscriptions

Check subscription status:
- **Stripe Dashboard**: Customers → Subscriptions
- **Database**: `stripe_subscriptions` table
- **Your App**: User's profile shows current plan
- **API Endpoint**: `GET /api/billing/subscription-status`

## 🔐 Security Notes

- ✅ Secret keys are only used server-side (in FastAPI backend)
- ✅ Webhook signatures are verified
- ✅ Customer IDs are validated before processing
- ✅ All Stripe communications use HTTPS
- ✅ User authentication required for checkout

## Need Help?

- Stripe Docs: https://stripe.com/docs
- Stripe Support: https://support.stripe.com
- Test Webhooks: https://stripe.com/docs/webhooks/test
