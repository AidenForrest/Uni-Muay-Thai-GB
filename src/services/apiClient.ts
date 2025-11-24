// API Client with Firebase Auth integration for Muay Thai GB

import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { auth } from '../config/firebase';
import { CONFIG } from '../config/features';
import { ApiResponse, ApiErrorResponse } from '../types/api.types';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: CONFIG.API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add Firebase auth token
    this.client.interceptors.request.use(
      async (config) => {
        try {
          const currentUser = auth.currentUser;
          if (currentUser) {
            const token = await currentUser.getIdToken();
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (error) {
          if (CONFIG.DEBUG_API_CALLS) {
            console.warn('Failed to get Firebase token:', error);
          }
        }

        if (CONFIG.DEBUG_API_CALLS) {
          console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`, {
            headers: config.headers,
            data: config.data,
          });
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling and logging
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        if (CONFIG.DEBUG_API_CALLS) {
          console.log(`API Response: ${response.status} ${response.config.url}`, {
            data: response.data,
          });
        }
        return response;
      },
      (error: AxiosError<ApiErrorResponse>) => {
        if (CONFIG.DEBUG_API_CALLS) {
          console.error(`API Error: ${error.response?.status} ${error.config?.url}`, {
            error: error.response?.data,
          });
        }

        // Handle common error cases
        const errorMessage = this.extractErrorMessage(error);
        
        // Transform axios error to our ApiResponse format
        const apiError: ApiResponse<any> = {
          success: false,
          error: errorMessage,
        };

        return Promise.reject(apiError);
      }
    );
  }

  private extractErrorMessage(error: AxiosError<ApiErrorResponse>): string {
    if (error.response?.data?.error?.message) {
      return error.response.data.error.message;
    }
    
    switch (error.response?.status) {
      case 400:
        return 'Bad request. Please check your input.';
      case 401:
        return 'Authentication failed. Please login again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 413:
        return 'Request too large. Please reduce the amount of data.';
      case 500:
        return 'Internal server error. Please try again later.';
      case 503:
        return 'Service unavailable. Please try again later.';
      default:
        return error.message || 'An unexpected error occurred.';
    }
  }

  // HTTP Methods
  async get<T>(url: string, params?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.get<T>(url, { params });
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return error as ApiResponse<T>;
    }
  }

  async post<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.post<T>(url, data);
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return error as ApiResponse<T>;
    }
  }

  async put<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.put<T>(url, data);
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return error as ApiResponse<T>;
    }
  }

  async patch<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.patch<T>(url, data);
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return error as ApiResponse<T>;
    }
  }

  async delete<T>(url: string): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.delete<T>(url);
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return error as ApiResponse<T>;
    }
  }

}

// Export singleton instance
export const apiClient = new ApiClient();