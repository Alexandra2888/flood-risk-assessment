import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getDatabase } from '@/lib/database';
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
    const db = getDatabase();

    // Get the primary email address
    const primaryEmail = data.email_addresses.find(email => 
      email.verification && email.verification.status === 'verified'
    ) || data.email_addresses[0];

    if (!primaryEmail) {
      console.error('No email address found for user:', data.id);
      return;
    }

    const userData = {
      clerkId: data.id,
      email: primaryEmail.email_address,
      firstName: data.first_name || undefined,
      lastName: data.last_name || undefined,
      imageUrl: data.image_url || undefined,
      lastSignInAt: data.last_sign_in_at ? new Date(data.last_sign_in_at).toISOString() : undefined,
    };

    await db.upsertUser(userData);
    console.log(`User ${data.id} synchronized successfully`);
  } catch (error) {
    console.error('Error upserting user:', error);
  }
}

async function handleSessionCreated(data: ClerkWebhookEvent['data']) {
  try {
    const db = getDatabase();

    // Update last sign in time
    const now = new Date().toISOString();
    await db.updateUser(data.id, { lastSignInAt: now });
    console.log(`Updated last sign in for user ${data.id}`);
  } catch (error) {
    console.error('Error updating last sign in:', error);
  }
}

export async function GET() {
  return NextResponse.json<ApiResponse>({
    success: true,
    message: 'Clerk webhook endpoint is active'
  });
}
