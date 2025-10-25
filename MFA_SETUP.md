# Multi-Factor Authentication (MFA) Setup Guide

This document outlines how to enable and configure Multi-Factor Authentication for API-Creator using Supabase Auth.

## Overview

We've implemented enhanced password security with:
- ✅ NIST password complexity validation
- ✅ HaveIBeenPwned password breach checking
- ✅ Real-time password strength indicator
- ⚠️ Email verification MFA (requires Supabase configuration)

## Current Password Security Features

### 1. NIST Password Guidelines
The signup process validates passwords against NIST Special Publication 800-63B guidelines:

- Minimum 8 characters (recommended 12+)
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character
- No common passwords
- No excessive repeated characters

### 2. HaveIBeenPwned Integration
Every password is checked against the HaveIBeenPwned database:

- Uses k-anonymity model (only first 5 characters of hash are sent)
- Checks against 600+ million breached passwords
- Real-time checking with debouncing
- Prevents use of compromised passwords

### 3. Visual Feedback
Users get instant feedback on password strength:

- Color-coded strength indicator (weak/fair/good/strong)
- List of validation errors
- Breach status notification
- Submit button disabled until requirements met

## Email Verification MFA Setup

To enable email verification as a form of MFA, follow these steps:

### Step 1: Configure Supabase Auth Settings

1. Go to your Supabase Dashboard
2. Navigate to **Authentication > Settings**
3. Scroll to **Email Auth**

#### Enable Email Confirmation

1. Check **Enable email confirmations**
2. Set **Confirmation Email Template** (optional, use default or customize)
3. Save changes

This will require users to verify their email before accessing the application.

### Step 2: Configure Email Templates

Navigate to **Authentication > Email Templates** and customize:

#### Confirmation Email
```html
<h2>Confirm your signup</h2>

<p>Follow this link to confirm your email:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your email</a></p>

<p>This link will expire in 24 hours.</p>
```

#### Magic Link (optional)
```html
<h2>Magic Link</h2>

<p>Follow this link to sign in:</p>
<p><a href="{{ .TokenHash }}">Sign in</a></p>

<p>This link will expire in 1 hour.</p>
```

### Step 3: Configure Redirect URLs

1. Go to **Authentication > URL Configuration**
2. Add your site URL: `https://your-domain.com`
3. Add redirect URLs:
   ```
   https://your-domain.com/**
   http://localhost:5173/**  (for development)
   ```

### Step 4: Update Auth Context (Already Implemented)

The authentication flow is already set up to handle email confirmation. When a user signs up:

```typescript
// In AuthContext.tsx
const signUp = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/dashboard`,
    },
  });

  if (error) throw error;

  // If email confirmation is enabled, user will need to verify email
  if (data.user && !data.user.confirmed_at) {
    // Show message to check email
    return { requiresEmailConfirmation: true };
  }

  return data;
};
```

### Step 5: Add Email Confirmation UI

Update the Signup component to show email confirmation message:

```typescript
const [emailConfirmationRequired, setEmailConfirmationRequired] = useState(false);

const handleSubmit = async (e: React.FormEvent) => {
  // ... existing validation ...

  try {
    const result = await signUp(email, password);

    if (result.requiresEmailConfirmation) {
      setEmailConfirmationRequired(true);
    } else {
      navigate('/dashboard');
    }
  } catch (err: any) {
    setError(err.message || 'Failed to create account');
  }
};

// Add this UI component
{emailConfirmationRequired && (
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
    <h3 className="font-semibold text-blue-900 mb-2">
      Check your email
    </h3>
    <p className="text-sm text-blue-700">
      We've sent you a confirmation link. Please check your email and click the link to verify your account.
    </p>
  </div>
)}
```

## Advanced MFA Options

### Option 1: Time-based One-Time Password (TOTP)

Supabase supports TOTP-based MFA using authenticator apps:

```typescript
// Enable MFA for a user
const { data, error } = await supabase.auth.mfa.enroll({
  factorType: 'totp',
  friendlyName: 'My Authenticator App',
});

// User scans QR code with authenticator app

// Verify TOTP code
const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
  factorId: data.id,
  challengeId: challenge.id,
  code: '123456', // User's TOTP code
});
```

### Option 2: SMS-based MFA

Requires Twilio integration:

```typescript
// Enable SMS MFA
const { data, error } = await supabase.auth.signInWithOtp({
  phone: '+1234567890',
});

// Verify SMS code
const { data: sessionData, error: verifyError } = await supabase.auth.verifyOtp({
  phone: '+1234567890',
  token: '123456',
  type: 'sms',
});
```

## Testing Email Verification

### Development Testing

1. **Supabase Local Email Capture**
   - In development, Supabase captures emails
   - View them in Dashboard > Authentication > Logs
   - Or use Inbucket (localhost:54324)

2. **Test Flow**
   ```
   1. Sign up with test email
   2. Check Supabase logs for confirmation link
   3. Click link to verify email
   4. User is redirected to dashboard
   ```

### Production Testing

1. Use a real email address
2. Complete signup flow
3. Check email inbox (including spam folder)
4. Click confirmation link
5. Verify redirect to application

## Security Recommendations

### 1. Rate Limiting
Implement rate limiting on:
- Signup attempts
- Login attempts
- Password reset requests
- Email resend requests

### 2. Email Security
- Use SPF, DKIM, and DMARC records
- Configure custom SMTP provider for better deliverability
- Monitor email bounce rates
- Implement email verification expiration

### 3. Session Management
```typescript
// Set session timeout
const { data, error } = await supabase.auth.refreshSession();

// Sign out from all devices
await supabase.auth.admin.signOut(userId, 'global');
```

### 4. Account Lockout
Implement account lockout after failed attempts:

```typescript
// Track failed attempts in database
// Lock account after 5 failed attempts
// Require email verification to unlock
```

## Monitoring & Analytics

Track these metrics:

1. **Signup Conversion**
   - Users who start signup
   - Users who complete email verification
   - Time to email verification

2. **Security Incidents**
   - Failed login attempts
   - Locked accounts
   - Password reset requests
   - Breached password attempts

3. **Email Deliverability**
   - Email sent successfully
   - Emails bounced
   - Confirmation link clicks
   - Time to email open

## Troubleshooting

### Users Not Receiving Confirmation Emails

1. **Check Spam Folder**
   - Advise users to check spam/junk folders

2. **Verify Email Settings**
   - Confirm SMTP configuration
   - Check email templates are valid
   - Verify sender email is authenticated

3. **Check Supabase Logs**
   - Review Dashboard > Authentication > Logs
   - Look for email delivery errors

4. **Test Email Delivery**
   - Use a test email service
   - Verify DNS records (SPF, DKIM)

### Confirmation Links Not Working

1. **Check Redirect URLs**
   - Verify URLs in Supabase settings
   - Ensure correct protocol (http/https)

2. **Link Expiration**
   - Default is 24 hours
   - Provide resend functionality

3. **Browser Issues**
   - Test in different browsers
   - Check for ad blockers
   - Verify JavaScript is enabled

## Custom SMTP Provider (Recommended for Production)

For better email deliverability, configure a custom SMTP provider:

### Supported Providers
- SendGrid
- AWS SES
- Mailgun
- Postmark
- Resend

### Configuration Steps

1. Go to **Project Settings > Auth > SMTP Settings**
2. Enter SMTP credentials:
   ```
   Host: smtp.example.com
   Port: 587
   Username: your-username
   Password: your-password
   Sender Email: noreply@your-domain.com
   Sender Name: API-Creator
   ```
3. Test connection
4. Save settings

## Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase MFA Guide](https://supabase.com/docs/guides/auth/auth-mfa)
- [NIST Password Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)
- [HaveIBeenPwned API](https://haveibeenpwned.com/API/v3)
- [TOTP Specification](https://datatracker.ietf.org/doc/html/rfc6238)

## Next Steps

1. ✅ Password security is fully implemented
2. ⚠️ Enable email confirmation in Supabase Dashboard
3. 📧 Configure custom SMTP provider
4. 🔐 Consider adding TOTP MFA for enterprise users
5. 📊 Set up monitoring and analytics
6. 🧪 Test thoroughly in development
7. 🚀 Deploy to production

For questions or issues, refer to the Supabase community or documentation.
