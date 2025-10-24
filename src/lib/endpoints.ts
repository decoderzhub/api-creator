export interface ParsedEndpoint {
  method: string;
  path: string;
  summary?: string;
  description?: string;
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

      for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
        const nextLine = lines[j].trim();

        const summaryMatch = nextLine.match(/summary=["']([^"']+)["']/);
        if (summaryMatch) {
          summary = summaryMatch[1];
        }

        const descMatch = nextLine.match(/description=["']([^"']+)["']/);
        if (descMatch) {
          description = descMatch[1];
        }

        if (nextLine.startsWith('async def') || nextLine.startsWith('def')) {
          break;
        }
      }

      endpoints.push({
        method,
        path,
        summary,
        description
      });
    }
  }

  return endpoints;
}

export function formatCurlExample(baseUrl: string, endpoint: ParsedEndpoint, apiKey: string): string {
  const url = `${baseUrl}${endpoint.path}`;

  if (endpoint.method === 'GET') {
    return `curl -X GET "${url}" \\\n  -H "Authorization: Bearer ${apiKey}"`;
  } else if (endpoint.method === 'POST') {
    return `curl -X POST "${url}" \\\n  -H "Authorization: Bearer ${apiKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"key": "value"}'`;
  } else if (endpoint.method === 'PUT') {
    return `curl -X PUT "${url}" \\\n  -H "Authorization: Bearer ${apiKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"key": "value"}'`;
  } else if (endpoint.method === 'DELETE') {
    return `curl -X DELETE "${url}" \\\n  -H "Authorization: Bearer ${apiKey}"`;
  } else if (endpoint.method === 'PATCH') {
    return `curl -X PATCH "${url}" \\\n  -H "Authorization: Bearer ${apiKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"key": "value"}'`;
  }

  return `curl -X ${endpoint.method} "${url}" \\\n  -H "Authorization: Bearer ${apiKey}"`;
}
