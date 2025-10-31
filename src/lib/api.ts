import { supabase } from './supabase';

const FASTAPI_BACKEND_URL = import.meta.env.VITE_FASTAPI_GATEWAY_URL || 'http://localhost:8000';

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
}

export const apiService = {
  generateAPICode: async (prompt: string, apiName: string) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${FASTAPI_BACKEND_URL}/api/generate-api-code`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ prompt, apiName }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to generate API code' }));
      throw new Error(error.detail || 'Failed to generate API code');
    }

    return response.json();
  },

  deployAPI: async (apiId: string) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${FASTAPI_BACKEND_URL}/api/deploy-api`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ apiId }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to deploy API' }));
      throw new Error(error.detail || 'Failed to deploy API');
    }

    return response.json();
  },

  getAPIAnalytics: async (apiId: string) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${FASTAPI_BACKEND_URL}/api/api-analytics/stats/${apiId}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to fetch analytics' }));
      throw new Error(error.detail || 'Failed to fetch analytics');
    }

    return response.json();
  },

  getAnalyticsOverview: async () => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${FASTAPI_BACKEND_URL}/api/api-analytics/overview`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to fetch overview' }));
      throw new Error(error.detail || 'Failed to fetch overview');
    }

    return response.json();
  },

  trackAPIUsage: async (apiId: string, statusCode: number, responseTimeMs: number, requestSizeBytes: number) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${FASTAPI_BACKEND_URL}/api/api-analytics/track`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ apiId, statusCode, responseTimeMs, requestSizeBytes }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to track usage' }));
      throw new Error(error.detail || 'Failed to track usage');
    }

    return response.json();
  },

  getMarketplaceAPIs: async () => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${FASTAPI_BACKEND_URL}/api/marketplace`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to fetch marketplace' }));
      throw new Error(error.detail || 'Failed to fetch marketplace');
    }

    return response.json();
  },

  publishToMarketplace: async (data: {
    apiId: string;
    title: string;
    description: string;
    pricePerCall?: number;
    category?: string;
  }) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${FASTAPI_BACKEND_URL}/api/marketplace/publish`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to publish API' }));
      throw new Error(error.detail || 'Failed to publish API');
    }

    return response.json();
  },

  updateMarketplaceListing: async (marketplaceId: string, data: {
    title?: string;
    description?: string;
    pricePerCall?: number;
    category?: string;
    isPublic?: boolean;
  }) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${FASTAPI_BACKEND_URL}/api/marketplace/${marketplaceId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to update listing' }));
      throw new Error(error.detail || 'Failed to update listing');
    }

    return response.json();
  },

  callUserAPI: async (apiId: string, apiKey: string, method: string, path: string, body?: any) => {
    const url = `${FASTAPI_BACKEND_URL}/${apiId}/${path}`;
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();
    return { status: response.status, data };
  },

  reloadAPI: async (apiId: string, adminKey: string) => {
    const response = await fetch(`${FASTAPI_BACKEND_URL}/admin/reload/${apiId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to reload API');
    }

    return response.json();
  },

  getSuggestedPrompts: async (apiName: string, partialPrompt: string) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${FASTAPI_BACKEND_URL}/api/suggest-prompts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ apiName, partialPrompt }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to get suggestions' }));
      throw new Error(error.detail || 'Failed to get suggestions');
    }

    return response.json();
  },

  getSuggestedAbout: async (apiName: string, partialPrompt: string) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${FASTAPI_BACKEND_URL}/api/suggest-about`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ apiName, partialPrompt }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to get about suggestions' }));
      throw new Error(error.detail || 'Failed to get about suggestions');
    }

    return response.json();
  },

  getRateLimitStatus: async (userId: string) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${FASTAPI_BACKEND_URL}/api/rate-limit-status/${userId}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to fetch rate limit status' }));
      throw new Error(error.detail || 'Failed to fetch rate limit status');
    }

    return response.json();
  },

  diagnoseAPI: async (apiId: string) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${FASTAPI_BACKEND_URL}/api/diagnose-api/${apiId}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to diagnose API' }));
      throw new Error(error.detail || 'Failed to diagnose API');
    }

    return response.json();
  },

  getContainerLogs: async (apiId: string, tail: number = 100) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${FASTAPI_BACKEND_URL}/api/container-logs/${apiId}?tail=${tail}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to get container logs' }));
      throw new Error(error.detail || 'Failed to get container logs');
    }

    return response.json();
  },

  troubleshootAPI: async (apiId: string, originalCode: string, originalPrompt: string, errorLogs: string) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${FASTAPI_BACKEND_URL}/api/troubleshoot-api`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ apiId, originalCode, originalPrompt, errorLogs }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to troubleshoot API' }));
      throw new Error(error.detail || 'Failed to troubleshoot API');
    }

    return response.json();
  },
};
