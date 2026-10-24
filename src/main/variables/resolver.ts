import type {
  EnvironmentVariable,
  HttpRequestExecutionPayload,
  KeyValuePair
} from '../../shared/types';

export interface VariableContext {
  global?: EnvironmentVariable[];
  collection?: EnvironmentVariable[];
  environment?: EnvironmentVariable[];
  request?: EnvironmentVariable[];
}

export class VariableResolver {
  private variableRegex = /\{\{([a-zA-Z0-9_.-]+)\}\}/g;

  /**
   * Builds an effective variable lookup map honoring deterministic precedence:
   * Request-Local > Environment > Collection > Global
   */
  public buildVariableMap(context: VariableContext): Map<string, string> {
    const map = new Map<string, string>();

    // 1. Global (lowest priority)
    if (context.global) {
      for (const v of context.global) {
        if (v.enabled) map.set(v.key, v.value);
      }
    }

    // 2. Collection
    if (context.collection) {
      for (const v of context.collection) {
        if (v.enabled) map.set(v.key, v.value);
      }
    }

    // 3. Environment
    if (context.environment) {
      for (const v of context.environment) {
        if (v.enabled) map.set(v.key, v.value);
      }
    }

    // 4. Request-local (highest priority)
    if (context.request) {
      for (const v of context.request) {
        if (v.enabled) map.set(v.key, v.value);
      }
    }

    return map;
  }

  public resolveString(template: string, context: VariableContext): string {
    const map = this.buildVariableMap(context);
    return template.replace(this.variableRegex, (match, varName) => {
      if (map.has(varName)) {
        return map.get(varName)!;
      }
      return match;
    });
  }

  public resolveWithDiagnostics(
    template: string,
    context: VariableContext
  ): { resolved: string; unresolved: string[] } {
    const map = this.buildVariableMap(context);
    const unresolved: string[] = [];

    const resolved = template.replace(this.variableRegex, (match, varName) => {
      if (map.has(varName)) {
        return map.get(varName)!;
      }
      unresolved.push(varName);
      return match;
    });

    return { resolved, unresolved };
  }

  public resolvePayload<T extends Partial<HttpRequestExecutionPayload>>(
    payload: T,
    context: VariableContext
  ): T {
    const map = this.buildVariableMap(context);

    const resolveStr = (str?: string): string => {
      if (!str) return str || '';
      return str.replace(this.variableRegex, (match, varName) => {
        return map.has(varName) ? map.get(varName)! : match;
      });
    };

    const resolved: any = { ...payload };

    if (payload.url) {
      resolved.url = resolveStr(payload.url);
    }

    if (payload.headers && Array.isArray(payload.headers)) {
      resolved.headers = payload.headers.map((h: KeyValuePair) => ({
        ...h,
        key: resolveStr(h.key),
        value: resolveStr(h.value)
      }));
    }

    if (payload.params && Array.isArray(payload.params)) {
      resolved.params = payload.params.map((p: KeyValuePair) => ({
        ...p,
        key: resolveStr(p.key),
        value: resolveStr(p.value)
      }));
    }

    if (payload.body) {
      resolved.body = { ...payload.body };
      if (payload.body.rawContent) {
        resolved.body.rawContent = resolveStr(payload.body.rawContent);
      }
      if (payload.body.urlencodedData && Array.isArray(payload.body.urlencodedData)) {
        resolved.body.urlencodedData = payload.body.urlencodedData.map((item: KeyValuePair) => ({
          ...item,
          key: resolveStr(item.key),
          value: resolveStr(item.value)
        }));
      }
    }

    if (payload.auth) {
      resolved.auth = { ...payload.auth };
      if (payload.auth.bearerToken) {
        resolved.auth.bearerToken = resolveStr(payload.auth.bearerToken);
      }
      if (payload.auth.basicUsername) {
        resolved.auth.basicUsername = resolveStr(payload.auth.basicUsername);
      }
      if (payload.auth.basicPassword) {
        resolved.auth.basicPassword = resolveStr(payload.auth.basicPassword);
      }
      if (payload.auth.apiKeyValue) {
        resolved.auth.apiKeyValue = resolveStr(payload.auth.apiKeyValue);
      }
    }

    return resolved;
  }
}
