export const API_BASE_URL = import.meta.env.VITE_FASTAPI_GATEWAY_URL || import.meta.env.VITE_API_URL || 'http://localhost:8663/api';

export interface EndpointParameter {
  name: string;
  type: 'path' | 'query' | 'body' | 'file';
  required: boolean;
  defaultValue?: string;
  description?: string;
  fileType?: string;
}

export interface ParsedEndpoint {
  method: string;
  path: string;
  summary?: string;
  description?: string;
  parameters: EndpointParameter[];
  requestType?: 'json' | 'multipart' | 'query';
  docstring?: string;
}

export function parseEndpointsFromCode(code: string): ParsedEndpoint[] {
  const endpoints: ParsedEndpoint[] = [];

  const lines = code.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    const getMatch = line.match(/@app\.get\(["']([^"']+)["']/);
    const postMatch = line.match(/@app\.post\(["']([^"']+)["']/);
    const putMatch = line.match(/@app\.put\(["']([^"']+)["']/);
    const deleteMatch = line.match(/@app\.delete\(["']([^"']+)["']/);
    const patchMatch = line.match(/@app\.patch\(["']([^"']+)["']/);

    let method = '';
    let path = '';

    if (getMatch) {
      method = 'GET';
      path = getMatch[1];
    } else if (postMatch) {
      method = 'POST';
      path = postMatch[1];
    } else if (putMatch) {
      method = 'PUT';
      path = putMatch[1];
    } else if (deleteMatch) {
      method = 'DELETE';
      path = deleteMatch[1];
    } else if (patchMatch) {
      method = 'PATCH';
      path = patchMatch[1];
    }

    if (method && path) {
      let summary = '';
      let description = '';
      const parameters: EndpointParameter[] = [];

      // Extract path parameters from the path itself
      const pathParams = path.match(/\{([^}]+)\}/g);
      if (pathParams) {
        pathParams.forEach(param => {
          const paramName = param.slice(1, -1);
          parameters.push({
            name: paramName,
            type: 'path',
            required: true
          });
        });
      }

      // Look ahead to find function definition and parameters
      for (let j = i + 1; j < Math.min(i + 30, lines.length); j++) {
        const nextLine = lines[j].trim();

        const summaryMatch = nextLine.match(/summary=["']([^"']+)["']/);
        if (summaryMatch) {
          summary = summaryMatch[1];
        }

        const descMatch = nextLine.match(/description=["']([^"']+)["']/);
        if (descMatch) {
          description = descMatch[1];
        }

        // Parse function signature for parameters
        if (nextLine.startsWith('async def') || nextLine.startsWith('def')) {
          // Get the full function signature (might span multiple lines)
          let funcSignature = nextLine;
          let k = j + 1;
          while (k < lines.length && !funcSignature.includes('):')) {
            funcSignature += ' ' + lines[k].trim();
            k++;
          }

          // Extract parameters from function signature
          const paramsMatch = funcSignature.match(/\(([^)]+)\)/);
          if (paramsMatch) {
            const paramsStr = paramsMatch[1];
            const paramsList = paramsStr.split(',').map(p => p.trim());

            paramsList.forEach(param => {
              if (!param || param === 'self') return;

              // Skip path parameters already added
              const paramNameMatch = param.match(/^([\w_]+)/);
              if (!paramNameMatch) return;
              const paramName = paramNameMatch[1];

              // Check if it's already added as path param
              if (parameters.some(p => p.name === paramName)) return;

              // Detect File parameters (UploadFile)
              if (param.includes('UploadFile') || param.includes('File(')) {
                const descriptionMatch = param.match(/description=["']([^"']+)["']/);
                parameters.push({
                  name: paramName,
                  type: 'file',
                  required: param.includes('File(...)') || !param.includes('='),
                  description: descriptionMatch ? descriptionMatch[1] : 'File upload',
                  fileType: 'any'
                });
              }
              // Detect Query parameters
              else if (param.includes('Query(')) {
                const hasDefault = param.includes('default=') || param.includes('=');
                const descriptionMatch = param.match(/description=["']([^"']+)["']/);
                parameters.push({
                  name: paramName,
                  type: 'query',
                  required: !hasDefault,
                  description: descriptionMatch ? descriptionMatch[1] : undefined
                });
              }
              // Detect Body parameters (Pydantic BaseModel instances)
              else if (param.includes('Body(')) {
                parameters.push({
                  name: paramName,
                  type: 'body',
                  required: !param.includes('default=') && !param.includes('=')
                });
              }
              // Plain typed parameters are query params by default in FastAPI
              else if (param.includes(':')) {
                const hasDefault = param.includes('=');
                parameters.push({
                  name: paramName,
                  type: 'query',
                  required: !hasDefault
                });
              }
            });
          }
          break;
        }
      }

      // Determine request type
      const hasFiles = parameters.some(p => p.type === 'file');
      const hasBody = parameters.some(p => p.type === 'body');

      let requestType: 'json' | 'multipart' | 'query' = 'query';
      if (hasFiles) {
        requestType = 'multipart';
      } else if (hasBody) {
        requestType = 'json';
      }

      // Extract docstring if available
      let docstring = '';
      for (let j = i + 1; j < Math.min(i + 40, lines.length); j++) {
        const docLine = lines[j].trim();
        if (docLine.includes('"""')) {
          let docStart = j;
          let docEnd = j;
          for (let k = j + 1; k < lines.length; k++) {
            if (lines[k].includes('"""')) {
              docEnd = k;
              break;
            }
          }
          docstring = lines.slice(docStart, docEnd + 1).join('\n');
          break;
        }
      }

      endpoints.push({
        method,
        path,
        summary,
        description,
        parameters,
        requestType,
        docstring
      });
    }
  }

  return endpoints;
}

function getExampleValue(paramName: string): string {
  const lowerName = paramName.toLowerCase();

  // Common parameter patterns with example values
  if (lowerName.includes('id')) return '123e4567-e89b-12d3-a456-426614174000';
  if (lowerName === 'category') return 'ambient';
  if (lowerName === 'duration') return '3.0';
  if (lowerName === 'limit') return '10';
  if (lowerName === 'offset') return '0';
  if (lowerName === 'page') return '1';
  if (lowerName === 'name') return 'example';
  if (lowerName === 'email') return 'user@example.com';
  if (lowerName === 'status') return 'active';
  if (lowerName.includes('width')) return '800';
  if (lowerName.includes('height')) return '600';
  if (lowerName.includes('size')) return '1024';
  if (lowerName.includes('format')) return 'jpg';
  if (lowerName.includes('quality')) return '90';

  // Default fallback
  return 'value';
}

export function formatCurlExample(baseUrl: string, endpoint: ParsedEndpoint, apiKey: string): string {
  let url = `${baseUrl}${endpoint.path}`;

  // Replace path parameters with example values
  const pathParams = endpoint.parameters.filter(p => p.type === 'path');
  pathParams.forEach(param => {
    const exampleValue = getExampleValue(param.name);
    url = url.replace(`{${param.name}}`, exampleValue);
  });

  // Separate parameter types
  const queryParams = endpoint.parameters.filter(p => p.type === 'query');
  const fileParams = endpoint.parameters.filter(p => p.type === 'file');
  const bodyParams = endpoint.parameters.filter(p => p.type === 'body');

  // Build curl command
  let curlCmd = `curl -X ${endpoint.method} "${url}`;

  // Add query params to URL if present and no files
  if (queryParams.length > 0 && fileParams.length === 0) {
    const queryString = queryParams.map(param => {
      const exampleValue = getExampleValue(param.name);
      return `${param.name}=${exampleValue}`;
    }).join('&');
    curlCmd += `?${queryString}`;
  }

  curlCmd += `" \\\n  -H "Authorization: Bearer ${apiKey}"`;

  // Handle file uploads (multipart/form-data)
  if (fileParams.length > 0) {
    fileParams.forEach(param => {
      const fileName = param.name === 'file' || param.name === 'image' ? 'image.jpg' : `${param.name}.jpg`;
      curlCmd += ` \\\n  -F "${param.name}=@/path/to/${fileName}"`;
    });

    // Add query params as form fields for file uploads
    queryParams.forEach(param => {
      const exampleValue = getExampleValue(param.name);
      curlCmd += ` \\\n  -F "${param.name}=${exampleValue}"`;
    });
  }
  // Handle JSON body
  else if (bodyParams.length > 0 || (['POST', 'PUT', 'PATCH'].includes(endpoint.method) && queryParams.length === 0)) {
    curlCmd += ` \\\n  -H "Content-Type: application/json" \\\n  -d '{"key": "value"}'`;
  }

  return curlCmd;
}
