export interface EndpointParameter {
  name: string;
  type: 'path' | 'query' | 'body';
  required: boolean;
  defaultValue?: string;
  description?: string;
}

export interface ParsedEndpoint {
  method: string;
  path: string;
  summary?: string;
  description?: string;
  parameters: EndpointParameter[];
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

              // Detect Query parameters
              if (param.includes('Query(')) {
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

      endpoints.push({
        method,
        path,
        summary,
        description,
        parameters
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

  // Add query parameters with example values
  const queryParams = endpoint.parameters.filter(p => p.type === 'query');
  if (queryParams.length > 0) {
    const queryString = queryParams.map(param => {
      const exampleValue = getExampleValue(param.name);
      return `${param.name}=${exampleValue}`;
    }).join('&');
    url += `?${queryString}`;
  }

  // Build curl command
  let curlCmd = `curl -X ${endpoint.method} "${url}" \\\n  -H "Authorization: Bearer ${apiKey}"`;

  // Add body for POST/PUT/PATCH
  const bodyParams = endpoint.parameters.filter(p => p.type === 'body');
  if (['POST', 'PUT', 'PATCH'].includes(endpoint.method) && bodyParams.length > 0) {
    curlCmd += ` \\\n  -H "Content-Type: application/json" \\\n  -d '{"key": "value"}'`;
  } else if (['POST', 'PUT', 'PATCH'].includes(endpoint.method) && queryParams.length === 0 && pathParams.length === 0) {
    // Fallback for POST/PUT/PATCH without detected params
    curlCmd += ` \\\n  -H "Content-Type: application/json" \\\n  -d '{"key": "value"}'`;
  }

  return curlCmd;
}
