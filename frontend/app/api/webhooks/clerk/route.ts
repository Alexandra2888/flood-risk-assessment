import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { ApiResponse } from '@/lib/types';
import { Webhook } from 'svix';

// Clerk webhook event types
interface ClerkWebhookEvent {
  type: string;
  data: {
    id: string;
    email_addresses: Array<{
      id: string;
      email_address: string;
      verification?: {
        status: string;
      };
    }>;
    first_name?: string;
    last_name?: string;
    image_url?: string;
    created_at?: number;
    updated_at?: number;
    last_sign_in_at?: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    // Get the headers
    const headerPayload = await headers();
    const svixId = headerPayload.get('svix-id');
    const svixTimestamp = headerPayload.get('svix-timestamp');
    const svixSignature = headerPayload.get('svix-signature');

    // If there are no headers, error out
    if (!svixId || !svixTimestamp || !svixSignature) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Error occurred -- no svix headers'
      }, { status: 400 });
    }

    // Get the body
    const payload = await request.text();

    // Verify the webhook (you'll need to set CLERK_WEBHOOK_SECRET in your environment)
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.warn('CLERK_WEBHOOK_SECRET not set, skipping webhook verification');
      // In development, you might want to skip verification
      // In production, this should be an error
    }

    let evt: ClerkWebhookEvent;

    if (webhookSecret) {
      try {
        const wh = new Webhook(webhookSecret);
        evt = wh.verify(payload, {
          'svix-id': svixId,
          'svix-timestamp': svixTimestamp,
          'svix-signature': svixSignature,
        }) as ClerkWebhookEvent;
      } catch (err) {
        console.error('Error verifying webhook:', err);
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Error occurred during webhook verification'
        }, { status: 400 });
      }
    } else {
      // Parse the payload directly (development only)
      try {
        evt = JSON.parse(payload);
      } catch (err) {
        console.error('Error parsing webhook payload:', err);
        return NextResponse.json<ApiResponse>({
          success: false,
          error: 'Error occurred parsing webhook payload'
        }, { status: 400 });
      }
    }

    const { type, data } = evt;

    // Handle different event types
    switch (type) {
      case 'user.created':
      case 'user.updated':
        await handleUserUpsert(data);
        break;
      case 'session.created':
        await handleSessionCreated(data);
        break;
      default:
        console.log(`Unhandled webhook type: ${type}`);
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Webhook processed successfully'
    });

  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

async function handleUserUpsert(data: ClerkWebhookEvent['data']) {
  try {
    console.log('User webhook received, but skipping local database operations');
    console.log('User sync will be handled by frontend auth flow calling backend API');
    console.log(`User ${data.id} webhook processed`);
  } catch (error) {
    console.error('Error processing user webhook:', error);
  }
}

async function handleSessionCreated(data: ClerkWebhookEvent['data']) {
  try {
    console.log('Session webhook received, but skipping local database operations');
    console.log('Session updates will be handled by frontend auth flow calling backend API');
    console.log(`Session for user ${data.id} webhook processed`);
  } catch (error) {
    console.error('Error processing session webhook:', error);
  }
}

export async function GET() {
  return NextResponse.json<ApiResponse>({
    success: true,
    message: 'Clerk webhook endpoint is active'
  });
}
