import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { ApiResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Missing token'
      }, { status: 400 });
    }

    const db = getDatabase();

    // For now, let's create a simpler verification method
    const allUsers = await db.getAllUsers();
    let validToken = null;
    let associatedUser = null;

    // Check all users for the token (not efficient, but works for demo)
    for (const user of allUsers) {
      const userTokenData = await db.getUserToken(user.clerkId);
      if (userTokenData && userTokenData.token === token) {
        const expiresAt = new Date(userTokenData.expiresAt);
        if (expiresAt > new Date()) {
          validToken = userTokenData;
          associatedUser = user;
          break;
        }
      }
    }

    if (!validToken || !associatedUser) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: 'Invalid or expired token'
      }, { status: 401 });
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        user: associatedUser,
        token: validToken.token,
        expiresAt: validToken.expiresAt,
      },
      message: 'Token is valid'
    });

  } catch (error) {
    console.error('Error verifying token:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
