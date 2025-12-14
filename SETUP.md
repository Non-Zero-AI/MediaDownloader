# Setup Guide for Enhanced Media Downloader

This guide will help you set up the enhanced Media Downloader app with user accounts, AI chat, knowledge base, and payment integration.

## Prerequisites

- Node.js (v16 or higher)
- npm
- Python (for yt-dlp)
- Supabase CLI (for local development)
- Stripe account (for payments)

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Set Up Supabase

### Local Development

1. Start Supabase locally:
```bash
npm run supabase:start
```

2. This will start Supabase on:
   - API: http://127.0.0.1:54321
   - Studio: http://127.0.0.1:54323
   - Database: localhost:54322

3. Run the migration to create the database schema:
```bash
npx supabase db reset
```

This will apply the migration in `supabase/migrations/20241214000000_initial_schema.sql`.

### Production

1. Create a Supabase project at https://supabase.com
2. Get your project URL and anon key from the project settings
3. Get your service role key (keep this secret!)
4. Run the migration on your production database

## Step 3: Configure Environment Variables

Create a `.env` file in the root directory:

```env
# OpenAI API Key (for Whisper transcription)
OPENAI_API_KEY=your_openai_api_key_here

# Supabase Configuration
SUPABASE_URL=http://127.0.0.1:54321  # Use your production URL in production
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
STRIPE_PRO_PRICE_ID=price_your_pro_price_id_here
STRIPE_ENTERPRISE_PRICE_ID=price_your_enterprise_price_id_here

# Server Port
PORT=3000
```

For the frontend, create a `.env.local` file:

```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

## Step 4: Set Up Stripe

1. Create a Stripe account at https://stripe.com
2. Get your API keys from the dashboard
3. Create products and prices for your subscription tiers:
   - Pro tier
   - Enterprise tier
4. Set up a webhook endpoint pointing to: `https://yourdomain.com/api/stripe-webhook`
5. Add the webhook secret to your `.env` file

## Step 5: Run the Application

### Development Mode

Terminal 1 (Frontend):
```bash
npm run dev
```

Terminal 2 (Backend):
```bash
npm run server
```

### Production Mode

```bash
npm run start
```

## Features

### 1. User Authentication
- Sign up and sign in with email/password
- User profiles stored in Supabase
- Protected routes for authenticated users

### 2. Knowledge Base
- Automatically saves downloaded media to user's knowledge base
- Stores transcripts with media items
- Search and filter functionality
- View and manage all downloaded content

### 3. AI Chat
- Chat with AI assistant about your downloaded content
- Uses context from your knowledge base
- Supports custom API keys
- Conversation history

### 4. Custom API Keys
- Users can add their own OpenAI/Anthropic/Google API keys
- Keys are stored securely (encryption recommended for production)
- Users can toggle keys on/off

### 5. Payment Integration
- Stripe integration for subscription management
- Pro and Enterprise tiers
- Webhook handling for subscription events

## Database Schema

The app uses the following main tables:

- `user_profiles` - User account information and subscription status
- `user_api_keys` - User's custom AI API keys
- `media_items` - Downloaded videos, audio, and text files
- `transcripts` - Transcriptions linked to media items
- `chat_conversations` - AI chat conversations
- `chat_messages` - Messages within conversations

## Security Notes

1. **API Keys**: In production, encrypt user API keys before storing them
2. **Service Role Key**: Never expose the Supabase service role key to the frontend
3. **Stripe Webhooks**: Always verify webhook signatures
4. **Authentication**: All protected routes require valid JWT tokens

## Troubleshooting

### Supabase Connection Issues
- Make sure Supabase is running: `npm run supabase:start`
- Check that the URL and keys in `.env` are correct
- Verify the migration has been applied

### Stripe Webhook Issues
- Ensure your webhook URL is publicly accessible
- Verify the webhook secret matches your Stripe dashboard
- Check Stripe logs for webhook delivery status

### Database Migration Issues
- Run `npx supabase db reset` to reset and reapply migrations
- Check Supabase Studio for table structure
- Verify RLS policies are enabled

## Next Steps

1. Set up production Supabase project
2. Configure Stripe products and prices
3. Set up webhook endpoints
4. Deploy to your hosting platform
5. Add API key encryption for production
6. Configure email templates for Supabase Auth

