import { useAuth, useUser } from '@clerk/nextjs';
import { useState, useEffect, useCallback } from 'react';
import { User, AuthenticatedUser, ApiResponse } from './types';

// Custom hook for handling user authentication and syncing
export function useAuthenticatedUser() {
  const { isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const [localUser, setLocalUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync user with local database
  const syncUser = useCallback(async () => {
    if (!isSignedIn || !user || !userId) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/auth/sync-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clerkId: userId,
          email: user.primaryEmailAddress?.emailAddress || '',
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          imageUrl: user.imageUrl || undefined,
          lastSignInAt: new Date().toISOString(),
        }),
      });

      const result: ApiResponse<User> = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to sync user');
      }

      setLocalUser(result.data!);
    } catch (err) {
      console.error('Error syncing user:', err);
      setError(err instanceof Error ? err.message : 'Failed to sync user');
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn, user, userId]);

  // Generate authentication token for FastAPI
  const generateToken = useCallback(async (expiresInMinutes?: number) => {
    if (!userId) {
      throw new Error('User not authenticated');
    }

    try {
      const response = await fetch('/api/auth/generate-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clerkId: userId,
          expiresInMinutes,
        }),
      });

      const result: ApiResponse<AuthenticatedUser> = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate token');
      }

      setAuthToken(result.data!.token);
      return result.data!;
    } catch (error) {
      console.error('Error generating token:', error);
      throw error;
    }
  }, [userId]);

  // Get existing token
  const getExistingToken = useCallback(async () => {
    if (!userId) return null;

    try {
      const response = await fetch('/api/auth/generate-token');
      const result: ApiResponse<AuthenticatedUser> = await response.json();

      if (result.success && result.data) {
        setAuthToken(result.data.token);
        return result.data;
      }
    } catch (error) {
      console.error('Error getting existing token:', error);
    }

    return null;
  }, [userId]);

  // Initialize user data
  useEffect(() => {
    if (isSignedIn && user) {
      syncUser();
    } else {
      setLocalUser(null);
      setAuthToken(null);
      setIsLoading(false);
    }
  }, [isSignedIn, user, userId, syncUser]);

  // Try to get existing token when user is synced, generate new one if none exists
  useEffect(() => {
    const initializeToken = async () => {
      if (localUser && !authToken && userId) {
        try {
          // Try to get existing token first
          const existingAuth = await getExistingToken();
          if (!existingAuth) {
            // If no existing token, generate a new one
            console.log('No existing token found, generating new token...');
            await generateToken();
          }
        } catch (error) {
          console.error('Error initializing token:', error);
          // If getting existing token fails, try generating a new one
          try {
            await generateToken();
          } catch (generateError) {
            console.error('Error generating new token:', generateError);
            setError('Failed to generate authentication token');
          }
        }
      }
    };

    initializeToken();
  }, [localUser, authToken, userId, getExistingToken, generateToken]);

  return {
    isAuthenticated: isSignedIn,
    clerkUser: user,
    localUser,
    authToken,
    isLoading,
    error,
    syncUser,
    generateToken,
    getExistingToken,
  };
}

// Utility function to make authenticated requests to FastAPI
export async function makeAuthenticatedRequest(
  url: string,
  token: string,
  options: RequestInit = {}
) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Utility function to verify token
export async function verifyToken(token: string): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/verify-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    const result: ApiResponse = await response.json();
    return result.success;
  } catch (error) {
    console.error('Error verifying token:', error);
    return false;
  }
}
