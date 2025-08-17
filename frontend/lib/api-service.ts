/**
 * Clean API service layer
 * Follows Repository pattern with proper error handling and types
 * Single source of truth for all backend API calls
 */

import { User, ApiResponse, AuthenticatedUser } from './types';

// API Configuration
const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1",
  timeout: 10000,
} as const;

// Custom Error Classes
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Network request failed') {
    super(message);
    this.name = 'NetworkError';
  }
}

// HTTP Client with proper error handling
class HttpClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_CONFIG.baseUrl}${endpoint}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new ApiError(
          `API request failed`,
          response.status,
          errorText
        );
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new NetworkError('Request timeout');
        }
        throw new NetworkError(error.message);
      }
      
      throw new NetworkError('Unknown error occurred');
    }
  }

  async get<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', headers });
  }

  async post<T>(
    endpoint: string,
    data?: unknown,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      headers,
    });
  }

  async postFormData<T>(
    endpoint: string,
    formData: FormData,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type for FormData - let browser handle it
        ...headers,
      },
    });
  }
}

// User API Service
export class UserApiService {
  constructor(private httpClient: HttpClient) {}

  async syncUser(userData: {
    clerkId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    imageUrl?: string;
    lastSignInAt?: string;
  }): Promise<User> {
    const response = await this.httpClient.post<ApiResponse<User>>(
      '/auth/sync-user',
      userData
    );

    if (!response.success || !response.data) {
      throw new ApiError(
        response.error || 'Failed to sync user',
        400
      );
    }

    return response.data;
  }

  async generateToken(
    clerkId: string,
    expiresInMinutes?: number
  ): Promise<AuthenticatedUser> {
    const response = await this.httpClient.post<ApiResponse<AuthenticatedUser>>(
      '/auth/generate-token',
      {
        clerkId,
        expiresInMinutes,
      }
    );

    if (!response.success || !response.data) {
      throw new ApiError(
        response.error || 'Failed to generate token',
        400
      );
    }

    return response.data;
  }

  async getExistingToken(authToken: string): Promise<AuthenticatedUser | null> {
    try {
      const response = await this.httpClient.get<ApiResponse<AuthenticatedUser>>(
        '/auth/token',
        {
          'Authorization': `Bearer ${authToken}`,
        }
      );

      if (!response.success || !response.data) {
        return null;
      }

      return response.data;
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  async verifyToken(token: string): Promise<User | null> {
    try {
      const response = await this.httpClient.post<ApiResponse<{ user: User }>>(
        '/auth/verify-token',
        token
      );

      if (!response.success || !response.data) {
        return null;
      }

      return response.data.user;
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 401) {
        return null;
      }
      throw error;
    }
  }

  async getCurrentUser(authToken: string): Promise<User> {
    const response = await this.httpClient.get<ApiResponse<User>>(
      '/auth/me',
      {
        'Authorization': `Bearer ${authToken}`,
      }
    );

    if (!response.success || !response.data) {
      throw new ApiError(
        response.error || 'Failed to get user info',
        401
      );
    }

    return response.data;
  }
}

// Analysis API Service
export class AnalysisApiService {
  constructor(private httpClient: HttpClient) {}

  async analyzeCoordinates(
    latitude: number,
    longitude: number,
    authToken: string
  ): Promise<{
    risk_level: string;
    description: string;
    recommendations: string[];
    elevation: number;
    distance_from_water: number;
    ai_analysis: string;
  }> {
    return this.httpClient.post(
      '/analyze/coordinates',
      { latitude, longitude },
      {
        'Authorization': `Bearer ${authToken}`,
      }
    );
  }

  async analyzeImage(
    file: File,
    authToken: string,
    location?: string
  ): Promise<{
    risk_level: string;
    description: string;
    recommendations: string[];
    elevation: number;
    distance_from_water: number;
    ai_analysis: string;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    if (location) {
      formData.append('location', location);
    }

    return this.httpClient.postFormData(
      '/analyze/image',
      formData,
      {
        'Authorization': `Bearer ${authToken}`,
      }
    );
  }
}

// Main API Service - Facade pattern
export class ApiService {
  private httpClient: HttpClient;
  public users: UserApiService;
  public analysis: AnalysisApiService;

  constructor() {
    this.httpClient = new HttpClient();
    this.users = new UserApiService(this.httpClient);
    this.analysis = new AnalysisApiService(this.httpClient);
  }

  // Health check
  async healthCheck(): Promise<{ status: string; service: string }> {
    return this.httpClient.get('/health');
  }
}

// Singleton instance
export const apiService = new ApiService();

// Export for testing and advanced usage
export { HttpClient };
