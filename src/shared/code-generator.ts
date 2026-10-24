import type { KeyValuePair, RequestBodyConfig } from './types';

export type SupportedLanguage = 'curl' | 'javascript' | 'python' | 'go' | 'rust';

export interface SnippetRequest {
  method: string;
  url: string;
  headers?: KeyValuePair[] | Array<{ key: string; value: string; enabled?: boolean }> | string;
  params?: KeyValuePair[] | Array<{ key: string; value: string; enabled?: boolean }> | string;
  body?: RequestBodyConfig | string;
}

function parseHeaders(rawHeaders?: SnippetRequest['headers']): Array<{ key: string; value: string }> {
  if (!rawHeaders) return [];
  if (typeof rawHeaders === 'string') {
    try {
      const parsed = JSON.parse(rawHeaders);
      if (Array.isArray(parsed)) {
        return parsed.filter((h: any) => h.enabled !== false && h.key).map((h: any) => ({ key: h.key, value: h.value || '' }));
      }
    } catch {
      return [];
    }
  }
  if (Array.isArray(rawHeaders)) {
    return rawHeaders.filter((h) => h.enabled !== false && h.key).map((h) => ({ key: h.key, value: h.value || '' }));
  }
  return [];
}

function parseBody(rawBody?: SnippetRequest['body']): string | null {
  if (!rawBody) return null;
  if (typeof rawBody === 'string') {
    try {
      const parsed = JSON.parse(rawBody);
      if (parsed && typeof parsed === 'object') {
        if (parsed.type === 'none') return null;
        if (parsed.rawContent) return parsed.rawContent;
      }
      return rawBody;
    } catch {
      return rawBody;
    }
  }
  if (typeof rawBody === 'object') {
    if (rawBody.type === 'none') return null;
    if (rawBody.rawContent) return rawBody.rawContent;
    if (rawBody.type === 'urlencoded' && rawBody.urlencodedData) {
      const params = new URLSearchParams();
      for (const item of rawBody.urlencodedData) {
        if (item.enabled !== false && item.key) {
          params.append(item.key, item.value || '');
        }
      }
      return params.toString();
    }
  }
  return null;
}

export function generateCodeSnippet(req: SnippetRequest, language: SupportedLanguage): string {
  const method = (req.method || 'GET').toUpperCase();
  const url = req.url || 'https://api.example.com';
  const headers = parseHeaders(req.headers);
  const bodyContent = parseBody(req.body);

  switch (language) {
    case 'curl': {
      let cmd = `curl -X ${method} "${url}"`;
      for (const h of headers) {
        cmd += ` \\\n  -H "${h.key}: ${h.value}"`;
      }
      if (bodyContent && method !== 'GET' && method !== 'HEAD') {
        const escapedBody = bodyContent.replace(/'/g, "'\\''");
        cmd += ` \\\n  -d '${escapedBody}'`;
      }
      return cmd;
    }

    case 'javascript': {
      const headersObj: Record<string, string> = {};
      for (const h of headers) {
        headersObj[h.key] = h.value;
      }

      const options: Record<string, any> = {
        method
      };
      if (Object.keys(headersObj).length > 0) {
        options.headers = headersObj;
      }
      if (bodyContent && method !== 'GET' && method !== 'HEAD') {
        options.body = bodyContent;
      }

      return `const response = await fetch("${url}", ${JSON.stringify(options, null, 2)});\nconst data = await response.json();\nconsole.log(data);`;
    }

    case 'python': {
      let py = `import requests\n\nurl = "${url}"\n`;
      if (headers.length > 0) {
        py += `headers = {\n${headers.map((h) => `    "${h.key}": "${h.value}"`).join(',\n')}\n}\n`;
      } else {
        py += `headers = {}\n`;
      }

      if (bodyContent && method !== 'GET' && method !== 'HEAD') {
        try {
          JSON.parse(bodyContent);
          py += `payload = ${bodyContent}\n`;
          py += `response = requests.${method.toLowerCase()}(url, headers=headers, json=payload)\n`;
        } catch {
          py += `payload = """${bodyContent}"""\n`;
          py += `response = requests.${method.toLowerCase()}(url, headers=headers, data=payload)\n`;
        }
      } else {
        py += `response = requests.${method.toLowerCase()}(url, headers=headers)\n`;
      }
      py += `print(response.status_code)\nprint(response.text)\n`;
      return py;
    }

    case 'go': {
      let goCode = `package main\n\nimport (\n\t"fmt"\n\t"io"\n\t"net/http"`;
      if (bodyContent && method !== 'GET' && method !== 'HEAD') {
        goCode += `\n\t"strings"`;
      }
      goCode += `\n)\n\nfunc main() {\n\turl := "${url}"\n`;

      if (bodyContent && method !== 'GET' && method !== 'HEAD') {
        goCode += `\tpayload := strings.NewReader(\`${bodyContent.replace(/`/g, '` + "`" + `')}\`)\n`;
        goCode += `\treq, err := http.NewRequest("${method}", url, payload)\n`;
      } else {
        goCode += `\treq, err := http.NewRequest("${method}", url, nil)\n`;
      }
      goCode += `\tif err != nil {\n\t\tpanic(err)\n\t}\n\n`;

      for (const h of headers) {
        goCode += `\treq.Header.Add("${h.key}", "${h.value}")\n`;
      }

      goCode += `\n\tres, err := http.DefaultClient.Do(req)\n\tif err != nil {\n\t\tpanic(err)\n\t}\n\tdefer res.Body.Close()\n\n\tbody, _ := io.ReadAll(res.Body)\n\tfmt.Println(res.Status)\n\tfmt.Println(string(body))\n}`;
      return goCode;
    }

    case 'rust': {
      let rust = `use reqwest::header::{HeaderMap, HeaderName, HeaderValue};\n\n#[tokio::main]\nasync fn main() -> Result<(), Box<dyn std::error::Error>> {\n`;
      rust += `    let client = reqwest::Client::new();\n`;
      if (headers.length > 0) {
        rust += `    let mut headers = HeaderMap::new();\n`;
        for (const h of headers) {
          rust += `    headers.insert(HeaderName::from_static("${h.key.toLowerCase()}"), HeaderValue::from_str("${h.value}")?);\n`;
        }
      }

      rust += `    let response = client\n        .${method.toLowerCase()}("${url}")\n`;
      if (headers.length > 0) {
        rust += `        .headers(headers)\n`;
      }
      if (bodyContent && method !== 'GET' && method !== 'HEAD') {
        rust += `        .body(\`${bodyContent}\`)\n`;
      }
      rust += `        .send()\n        .await?;\n\n`;
      rust += `    println!("Status: {}", response.status());\n    println!("Body: {}", response.text().await?);\n    Ok(())\n}`;
      return rust;
    }

    default:
      return `# Language not supported`;
  }
}
