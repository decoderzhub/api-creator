# Stripe Integration Guide

This document outlines the steps required to integrate Stripe payments into API-Creator for handling subscription billing.

## Prerequisites

1. A Stripe account (sign up at https://stripe.com)
2. Stripe API keys (Test and Live)
3. Supabase project with database access

## Step 1: Stripe Account Setup

### Create Stripe Account
1. Go to https://dashboard.stripe.com/register
2. Complete the registration process
3. Verify your email address

### Get API Keys
1. Navigate to **Developers > API keys** in your Stripe Dashboard
2. Copy your **Publishable key** and **Secret key**
3. Start with test keys (they begin with `pk_test_` and `sk_test_`)

### Create Products and Prices

#### Pro Plan ($29/month)
1. Go to **Products** in Stripe Dashboard
2. Click **Add Product**
3. Set:
   - Name: "Pro Plan"
   - Description: "20 API generations per month with priority support"
   - Pricing: $29.00 USD / month (recurring)
4. Copy the **Price ID** (starts with `price_`)

#### Enterprise Plan ($99/month)
1. Click **Add Product**
2. Set:
   - Name: "Enterprise Plan"
   - Description: "Unlimited API generations with 24/7 support"
   - Pricing: $99.00 USD / month (recurring)
3. Copy the **Price ID**

## Step 2: Environment Variables

Add these to your `.env` file:

```bash
# Stripe Keys
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Stripe Price IDs
STRIPE_PRO_PRICE_ID=price_...
STRIPE_ENTERPRISE_PRICE_ID=price_...

# Stripe Webhook Secret (we'll add this after creating webhook)
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Step 3: Install Stripe Dependencies

```bash
npm install @stripe/stripe-js stripe
```

## Step 4: Create Supabase Edge Function for Stripe

Create a Supabase Edge Function to handle Stripe checkout sessions:

```typescript
// supabase/functions/create-checkout-session/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@13.6.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { priceId, userId, userEmail } = await req.json()

    const session = await stripe.checkout.sessions.create({
      customer_email: userEmail,
      client_reference_id: userId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.get('origin')}/billing?success=true`,
      cancel_url: `${req.headers.get('origin')}/billing?canceled=true`,
      metadata: {
        userId: userId,
      },
    })

    return new Response(
      JSON.stringify({ sessionId: session.id }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
```

## Step 5: Create Stripe Webhook Handler

Create another Edge Function to handle Stripe webhooks:

```typescript
// supabase/functions/stripe-webhook/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@13.6.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const body = await req.text()

  let event

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400 })
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object
      const userId = session.metadata?.userId

      // Determine plan from price ID
      const priceId = session.line_items?.data[0]?.price?.id
      let plan = 'free'

      if (priceId === Deno.env.get('STRIPE_PRO_PRICE_ID')) {
        plan = 'pro'
      } else if (priceId === Deno.env.get('STRIPE_ENTERPRISE_PRICE_ID')) {
        plan = 'enterprise'
      }

      // Update user's plan in database
      await supabase
        .from('users')
        .update({
          plan: plan,
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
        })
        .eq('id', userId)

      break

    case 'customer.subscription.deleted':
      const subscription = event.data.object

      // Downgrade user to free plan
      await supabase
        .from('users')
        .update({ plan: 'free' })
        .eq('stripe_subscription_id', subscription.id)

      break

    case 'customer.subscription.updated':
      // Handle subscription updates
      break
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 })
})
```

## Step 6: Update Database Schema

Add Stripe-related columns to the users table:

```sql
ALTER TABLE users
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription ON users(stripe_subscription_id);
```

## Step 7: Configure Stripe Webhook

1. Go to **Developers > Webhooks** in Stripe Dashboard
2. Click **Add endpoint**
3. Set endpoint URL to your Supabase Function URL:
   ```
   https://your-project.supabase.co/functions/v1/stripe-webhook
   ```
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`
5. Copy the **Signing secret** (starts with `whsec_`)
6. Add it to your environment variables as `STRIPE_WEBHOOK_SECRET`

## Step 8: Update Frontend Billing Page

Update the Billing page to integrate with Stripe Checkout:

```typescript
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const handleUpgrade = async (priceId: string) => {
  const stripe = await stripePromise;

  // Call your Edge Function to create checkout session
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        priceId,
        userId: profile.id,
        userEmail: profile.email,
      }),
    }
  );

  const { sessionId } = await response.json();

  // Redirect to Stripe Checkout
  const result = await stripe?.redirectToCheckout({ sessionId });

  if (result?.error) {
    console.error(result.error.message);
  }
};
```

## Step 9: Test the Integration

### Test Mode
1. Use test credit card: `4242 4242 4242 4242`
2. Use any future expiry date
3. Use any 3-digit CVC
4. Use any ZIP code

### Testing Workflow
1. Navigate to Billing page
2. Click "Upgrade to Pro" or "Upgrade to Enterprise"
3. Complete checkout with test card
4. Verify redirect back to your app
5. Check that user's plan is updated in database
6. Verify webhook is received in Stripe Dashboard

## Step 10: Go Live

### When Ready for Production:

1. **Replace Test Keys with Live Keys**
   - Get live keys from Stripe Dashboard
   - Update `.env` with live keys (they start with `pk_live_` and `sk_live_`)

2. **Update Webhook Endpoint**
   - Create new webhook endpoint with live mode enabled
   - Update `STRIPE_WEBHOOK_SECRET` with live webhook secret

3. **Complete Stripe Verification**
   - Submit business information
   - Complete identity verification
   - Verify bank account for payouts

4. **Enable Required Settings**
   - Enable Customer Portal in Stripe Dashboard (Settings > Billing > Customer Portal)
   - Configure email notifications
   - Set up tax collection if required

## Security Best Practices

1. **Never expose secret keys** - Only use them server-side in Edge Functions
2. **Verify webhook signatures** - Always validate webhook events
3. **Use HTTPS** - Ensure all communications are encrypted
4. **Implement idempotency** - Handle duplicate webhook events
5. **Log everything** - Keep detailed logs for debugging and auditing

## Support Resources

- Stripe Documentation: https://stripe.com/docs
- Stripe Testing: https://stripe.com/docs/testing
- Webhook Testing: https://stripe.com/docs/webhooks/test
- Stripe Support: https://support.stripe.com/

## Common Issues & Solutions

### Issue: Webhook not receiving events
- Verify endpoint URL is correct
- Check webhook signing secret matches
- Ensure Edge Function is deployed
- Check Stripe Dashboard > Webhooks for delivery attempts

### Issue: Checkout session fails
- Verify Price IDs are correct
- Check API keys are valid
- Ensure Edge Function has correct environment variables
- Check CORS headers are set properly

### Issue: User plan not updating
- Verify webhook handler is processing events
- Check database permissions
- Review Edge Function logs in Supabase
- Confirm userId is passed correctly in metadata
