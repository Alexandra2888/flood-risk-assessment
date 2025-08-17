import { useAuth, useUser } from '@clerk/nextjs';
import { useState, useEffect, useCallback } from 'react';
import { User, AuthenticatedUser } from './types';
import { apiService, ApiError, NetworkError } from './api-service';

/**
 * Custom hook for handling user authentication and syncing
 */
export function useAuthenticatedUser() {
  const { isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const [localUser, setLocalUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync user with backend database
  const syncUser = useCallback(async () => {
    if (!isSignedIn || !user || !userId) return;

    try {
      setIsLoading(true);
      setError(null);

      const userData = {
        clerkId: userId,
        email: user.primaryEmailAddress?.emailAddress || '',
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
        imageUrl: user.imageUrl || undefined,
        lastSignInAt: new Date().toISOString(),
      };

      const syncedUser = await apiService.users.syncUser(userData);
      setLocalUser(syncedUser);
      
    } catch (err) {
      console.error('Error syncing user:', err);
      const errorMessage = err instanceof ApiError 
        ? `Sync failed: ${err.message}` 
        : err instanceof NetworkError
        ? 'Network error - please check your connection'
        : 'Failed to sync user';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn, user, userId]);

  // Generate authentication token for backend API
  const generateToken = useCallback(async (expiresInMinutes?: number) => {
    if (!userId) {
      throw new Error('User not authenticated');
    }

    try {
      const authenticatedUser = await apiService.users.generateToken(
        userId,
        expiresInMinutes
      );
      
      setAuthToken(authenticatedUser.token);
      return authenticatedUser;
      
    } catch (error) {
      console.error('Error generating token:', error);
      
      if (error instanceof ApiError) {
        throw new Error(`Token generation failed: ${error.message}`);
      } else if (error instanceof NetworkError) {
        throw new Error('Network error - please check your connection');
      } else {
        throw new Error('Failed to generate authentication token');
      }
    }
  }, [userId]);

  // Get existing valid token
  const getExistingToken = useCallback(async () => {
    if (!userId || !authToken) return null;

    try {
      const authenticatedUser = await apiService.users.getExistingToken(authToken);
      if (authenticatedUser) {
        setAuthToken(authenticatedUser.token);
      }
      return authenticatedUser;
      
    } catch (error) {
      console.error('Error getting existing token:', error);
      return null;
    }
  }, [userId, authToken]);

  // Initialize user data when Clerk auth state changes
  useEffect(() => {
    if (isSignedIn && user) {
      syncUser();
    } else {
      setLocalUser(null);
      setAuthToken(null);
      setIsLoading(false);
      setError(null);
    }
  }, [isSignedIn, user, userId, syncUser]);

  // Initialize token after user sync
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
  }, [localUser, authToken, userId, generateToken, getExistingToken]);

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

/**
 * Legacy utility functions removed - use apiService instead
 * All authentication and API calls now go through the backend
 */
