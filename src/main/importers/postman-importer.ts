import { randomUUID } from 'node:crypto';
import type {
  Collection,
  Folder,
  RequestItem,
  Environment,
  EnvironmentVariable,
  KeyValuePair
} from '../../shared/types';

export interface ImportReport {
  success: boolean;
  collection: Collection;
  folders: Folder[];
  requests: RequestItem[];
  warnings: string[];
}

export class PostmanImporter {
  public importCollection(json: any, workspaceId: string): ImportReport {
    if (!json || typeof json !== 'object') {
      throw new Error('Invalid JSON format for Postman Collection');
    }

    const info = json.info || {};
    const collectionId = randomUUID();
    const now = new Date().toISOString();

    const collection: Collection = {
      id: collectionId,
      workspaceId,
      name: info.name || 'Imported Postman Collection',
      description: typeof info.description === 'string' ? info.description : '',
      variables: JSON.stringify(this.parseVariables(json.variable || [])),
      createdAt: now,
      updatedAt: now
    };

    const folders: Folder[] = [];
    const requests: RequestItem[] = [];
    const warnings: string[] = [];

    this.processItems(json.item || [], collectionId, null, folders, requests, warnings);

    return {
      success: true,
      collection,
      folders,
      requests,
      warnings
    };
  }

  public importEnvironment(json: any, workspaceId: string): Environment {
    if (!json || typeof json !== 'object') {
      throw new Error('Invalid JSON format for Postman Environment');
    }

    const envId = randomUUID();
    const now = new Date().toISOString();
    const rawValues = json.values || [];

    const variables: EnvironmentVariable[] = rawValues.map((v: any) => ({
      key: v.key || '',
      value: String(v.value !== undefined ? v.value : ''),
      type: v.type === 'secret' ? 'secret' : 'default',
      enabled: v.enabled !== false
    }));

    return {
      id: envId,
      workspaceId,
      name: json.name || 'Imported Environment',
      variables,
      isActive: false,
      createdAt: now,
      updatedAt: now
    };
  }

  private processItems(
    items: any[],
    collectionId: string,
    parentFolderId: string | null,
    folders: Folder[],
    requests: RequestItem[],
    warnings: string[]
  ): void {
    for (const item of items) {
      if (!item) continue;

      // Item is a folder if it contains child items and not a direct request
      if (Array.isArray(item.item) && !item.request) {
        const folderId = randomUUID();
        const folder: Folder = {
          id: folderId,
          collectionId,
          parentFolderId,
          name: item.name || 'Folder',
          sortOrder: folders.length
        };
        folders.push(folder);

        // Recurse into nested folder
        this.processItems(item.item, collectionId, folderId, folders, requests, warnings);
      } else if (item.request) {
        // Item is a request
        const req = item.request;
        const now = new Date().toISOString();

        let method = 'GET';
        let url = '';
        let headers: KeyValuePair[] = [];
        let params: KeyValuePair[] = [];
        let bodyJson = '{}';

        if (typeof req === 'string') {
          url = req;
        } else {
          method = (req.method || 'GET').toUpperCase();

          // Parse URL
          if (typeof req.url === 'string') {
            url = req.url;
          } else if (req.url && typeof req.url === 'object') {
            url = req.url.raw || '';
            if (Array.isArray(req.url.query)) {
              params = req.url.query.map((q: any) => ({
                id: randomUUID(),
                key: q.key || '',
                value: q.value || '',
                enabled: !q.disabled,
                description: q.description || ''
              }));
            }
          }

          // Parse Headers
          if (Array.isArray(req.header)) {
            headers = req.header.map((h: any) => ({
              id: randomUUID(),
              key: h.key || '',
              value: h.value || '',
              enabled: !h.disabled,
              description: h.description || ''
            }));
          }

          // Parse Body
          if (req.body && typeof req.body === 'object') {
            const mode = req.body.mode;
            if (mode === 'raw') {
              bodyJson = JSON.stringify({
                type: 'json',
                rawContent: req.body.raw || ''
              });
            } else if (mode === 'urlencoded' && Array.isArray(req.body.urlencoded)) {
              bodyJson = JSON.stringify({
                type: 'urlencoded',
                urlencodedData: req.body.urlencoded.map((u: any) => ({
                  id: randomUUID(),
                  key: u.key || '',
                  value: u.value || '',
                  enabled: !u.disabled
                }))
              });
            }
          }
        }

        // Parse Scripts (prerequest & test)
        let preScript = '';
        let testScript = '';
        if (Array.isArray(item.event)) {
          for (const ev of item.event) {
            if (ev.listen === 'prerequest' && ev.script) {
              if (Array.isArray(ev.script.exec)) {
                preScript = ev.script.exec.join('\n');
              } else if (typeof ev.script.exec === 'string') {
                preScript = ev.script.exec;
              }
            } else if (ev.listen === 'test' && ev.script) {
              if (Array.isArray(ev.script.exec)) {
                testScript = ev.script.exec.join('\n');
              } else if (typeof ev.script.exec === 'string') {
                testScript = ev.script.exec;
              }
            }
          }
        }

        const requestItem: RequestItem = {
          id: randomUUID(),
          collectionId,
          folderId: parentFolderId,
          name: item.name || 'Request',
          method,
          url,
          headers: JSON.stringify(headers),
          params: JSON.stringify(params),
          body: bodyJson,
          preScript: preScript || undefined,
          testScript: testScript || undefined,
          sortOrder: requests.length,
          createdAt: now,
          updatedAt: now
        };

        requests.push(requestItem);
      } else {
        warnings.push(`Unrecognized item skipped: "${item.name || 'Unnamed'}"`);
      }
    }
  }

  private parseVariables(variables: any[]): EnvironmentVariable[] {
    return variables.map((v) => ({
      key: v.key || '',
      value: String(v.value !== undefined ? v.value : ''),
      type: v.type === 'secret' ? 'secret' : 'default',
      enabled: !v.disabled
    }));
  }
}
