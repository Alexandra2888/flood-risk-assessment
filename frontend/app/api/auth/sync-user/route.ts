import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getDatabase } from '@/lib/database';
import { SyncUserRequest, ApiResponse } from '@/lib/types';

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

    const body: SyncUserRequest = await request.json();

    // Validate required fields
    if (!body.clerkId || !body.email) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Missing required fields: clerkId and email are required'
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

    // Upsert user in database
    const userData = {
      clerkId: body.clerkId,
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      imageUrl: body.imageUrl,
      lastSignInAt: body.lastSignInAt || new Date().toISOString(),
    };

    const user = await db.upsertUser(userData);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: user,
      message: 'User synchronized successfully'
    });

  } catch (error) {
    console.error('Error syncing user:', error);
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
    const user = await db.getUserByClerkId(userId);

    if (!user) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'User not found in database. Please sync first.'
      }, { status: 404 });
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Error getting user:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
