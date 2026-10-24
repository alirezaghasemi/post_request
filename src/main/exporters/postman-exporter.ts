import type { Collection, Folder, RequestItem, Environment } from '../../shared/types';

export class PostmanExporter {
  public exportCollection(collection: Collection, folders: Folder[], requests: RequestItem[]): any {
    const postmanItems: any[] = [];

    // Map folders by ID
    const folderMap = new Map<string, { folder: Folder; items: any[] }>();
    for (const folder of folders) {
      folderMap.set(folder.id, { folder, items: [] });
    }

    // Assign requests either to a folder or to top-level
    for (const req of requests) {
      const itemObj = this.formatRequestItem(req);
      if (req.folderId && folderMap.has(req.folderId)) {
        folderMap.get(req.folderId)!.items.push(itemObj);
      } else {
        postmanItems.push(itemObj);
      }
    }

    // Nest folders
    for (const { folder, items } of folderMap.values()) {
      const folderObj = {
        name: folder.name,
        item: items
      };
      if (folder.parentFolderId && folderMap.has(folder.parentFolderId)) {
        folderMap.get(folder.parentFolderId)!.items.push(folderObj);
      } else {
        postmanItems.push(folderObj);
      }
    }

    let parsedVars: any[] = [];
    try {
      if (collection.variables) {
        parsedVars = JSON.parse(collection.variables).map((v: any) => ({
          key: v.key,
          value: v.value,
          type: 'string'
        }));
      }
    } catch {
      // Ignored
    }

    return {
      info: {
        _postman_id: collection.id,
        name: collection.name,
        description: collection.description || '',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: postmanItems,
      variable: parsedVars
    };
  }

  public exportEnvironment(environment: Environment): any {
    return {
      id: environment.id,
      name: environment.name,
      values: environment.variables.map((v) => ({
        key: v.key,
        value: v.value,
        type: v.type,
        enabled: v.enabled
      })),
      _postman_variable_scope: 'environment'
    };
  }

  private formatRequestItem(req: RequestItem): any {
    let headers: any[] = [];
    try {
      if (req.headers) {
        const rawHeaders = JSON.parse(req.headers);
        headers = rawHeaders.map((h: any) => ({
          key: h.key,
          value: h.value,
          disabled: !h.enabled,
          description: h.description
        }));
      }
    } catch {
      // Ignored
    }

    let bodyObj: any = undefined;
    try {
      if (req.body) {
        const parsedBody = JSON.parse(req.body);
        if (parsedBody.type === 'json' || parsedBody.type === 'text') {
          bodyObj = {
            mode: 'raw',
            raw: parsedBody.rawContent || '',
            options: {
              raw: {
                language: parsedBody.type === 'json' ? 'json' : 'text'
              }
            }
          };
        } else if (parsedBody.type === 'urlencoded' && parsedBody.urlencodedData) {
          bodyObj = {
            mode: 'urlencoded',
            urlencoded: parsedBody.urlencodedData.map((u: any) => ({
              key: u.key,
              value: u.value,
              disabled: !u.enabled
            }))
          };
        }
      }
    } catch {
      // Ignored
    }

    return {
      name: req.name,
      request: {
        method: req.method,
        header: headers,
        body: bodyObj,
        url: {
          raw: req.url
        }
      }
    };
  }
}
