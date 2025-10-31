import { supabase } from '../supabase';

const FASTAPI_URL = import.meta.env.VITE_FASTAPI_GATEWAY_URL;

export interface GenerateIntegrationRequest {
  api_id: string;
  description: string;
  target_language: string;
  integration_type?: string;
  save_template?: boolean;
}

export interface GenerateSDKRequest {
  api_id: string;
  languages: string[];
}

export interface IntegrationResponse {
  id?: string;
  code: string;
  dependencies: string[];
  setup_instructions: string;
  usage_example: string;
  language: string;
  integration_type: string;
}

export interface SavedIntegration {
  id: string;
  template_name: string;
  integration_type: string;
  target_language: string;
  description?: string;
  created_at: string;
  code?: string;
  dependencies?: string[];
  setup_instructions?: string;
}

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }

  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  };
}

export async function generateIntegration(
  request: GenerateIntegrationRequest
): Promise<IntegrationResponse> {
  const headers = await getAuthHeader();

  const response = await fetch(`${FASTAPI_URL}/api/integration/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to generate integration');
  }

  return response.json();
}

export async function generateSDK(
  request: GenerateSDKRequest
): Promise<{ api_id: string; sdks: Record<string, IntegrationResponse> }> {
  const headers = await getAuthHeader();

  const response = await fetch(`${FASTAPI_URL}/api/integration/generate-sdk`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to generate SDK');
  }

  return response.json();
}

export async function getUserTemplates(apiId?: string): Promise<SavedIntegration[]> {
  const headers = await getAuthHeader();

  const url = apiId
    ? `${FASTAPI_URL}/api/integration/templates?api_id=${apiId}`
    : `${FASTAPI_URL}/api/integration/templates`;

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error('Failed to fetch templates');
  }

  return response.json();
}

export async function getTemplate(templateId: string): Promise<SavedIntegration> {
  const headers = await getAuthHeader();

  const response = await fetch(`${FASTAPI_URL}/api/integration/templates/${templateId}`, {
    headers
  });

  if (!response.ok) {
    throw new Error('Failed to fetch template');
  }

  return response.json();
}

export async function deleteTemplate(templateId: string): Promise<void> {
  const headers = await getAuthHeader();

  const response = await fetch(`${FASTAPI_URL}/api/integration/templates/${templateId}`, {
    method: 'DELETE',
    headers
  });

  if (!response.ok) {
    throw new Error('Failed to delete template');
  }
}

export async function getSystemTemplates(integrationType?: string): Promise<SavedIntegration[]> {
  const url = integrationType
    ? `${FASTAPI_URL}/api/integration/system-templates?integration_type=${integrationType}`
    : `${FASTAPI_URL}/api/integration/system-templates`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch system templates');
  }

  return response.json();
}
