import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getDatabase } from '@/lib/database';
import { GenerateTokenRequest, ApiResponse, AuthenticatedUser } from '@/lib/types';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    // Verify the user is authenticated with Clerk
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized - no Clerk user ID found'
      }, { status: 401 });
    }

    const body: GenerateTokenRequest = await request.json();

    // Validate required fields
    if (!body.clerkId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Missing required field: clerkId'
      }, { status: 400 });
    }

    // Ensure the authenticated user matches the request
    if (userId !== body.clerkId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized - Clerk ID mismatch'
      }, { status: 403 });
    }

    const db = getDatabase();

    // Get user from database
    const user = await db.getUserByClerkId(body.clerkId);
    if (!user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'User not found. Please sync user first.'
      }, { status: 404 });
    }

    // Generate a secure token
    const token = crypto.randomBytes(32).toString('base64url');
    
    // Set expiration (default 24 hours, configurable up to 7 days)
    const expiresInMinutes = Math.min(body.expiresInMinutes || 1440, 10080); // Max 7 days
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString();

    // Clean up expired tokens first
    await db.deleteExpiredTokens();

    // Create new token
    const userToken = await db.createUserToken({
      userId: user.id,
      clerkId: body.clerkId,
      token,
      expiresAt,
    });

    const authenticatedUser: AuthenticatedUser = {
      user,
      token: userToken.token,
      expiresAt: userToken.expiresAt,
    };

    return NextResponse.json<ApiResponse<AuthenticatedUser>>({
      success: true,
      data: authenticatedUser,
      message: 'Token generated successfully'
    });

  } catch (error) {
    console.error('Error generating token:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Get the current authenticated user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const db = getDatabase();

    // Get user from database
    const user = await db.getUserByClerkId(userId);
    if (!user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'User not found. Please sync user first.'
      }, { status: 404 });
    }

    // Get existing valid token
    const existingToken = await db.getUserToken(userId);
    
    if (!existingToken) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'No valid token found. Please generate a new token.'
      }, { status: 404 });
    }

    const authenticatedUser: AuthenticatedUser = {
      user,
      token: existingToken.token,
      expiresAt: existingToken.expiresAt,
    };

    return NextResponse.json<ApiResponse<AuthenticatedUser>>({
      success: true,
      data: authenticatedUser
    });

  } catch (error) {
    console.error('Error getting token:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
