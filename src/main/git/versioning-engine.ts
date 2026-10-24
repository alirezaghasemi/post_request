import * as fs from 'node:fs';
import * as path from 'node:path';
import type { RequestItem, Collection } from '../../shared/types';

export interface FieldDiff {
  field: string;
  hasChanges: boolean;
  diffType: 'added' | 'removed' | 'modified' | 'unchanged';
  before?: any;
  after?: any;
}

export interface RequestDiffResult {
  hasDifferences: boolean;
  fieldDiffs: FieldDiff[];
  summary: {
    totalChanges: number;
    changedFields: string[];
  };
}

export class VersioningEngine {
  public diffRequests(before: RequestItem, after: RequestItem): RequestDiffResult {
    const fieldDiffs: FieldDiff[] = [];
    const changedFields: string[] = [];

    const compareSimple = (field: keyof RequestItem) => {
      const bVal = before[field];
      const aVal = after[field];
      const hasChanges = bVal !== aVal;

      let diffType: 'added' | 'removed' | 'modified' | 'unchanged' = 'unchanged';
      if (hasChanges) {
        if (!bVal && aVal) diffType = 'added';
        else if (bVal && !aVal) diffType = 'removed';
        else diffType = 'modified';
        changedFields.push(String(field));
      }

      fieldDiffs.push({
        field: String(field),
        hasChanges,
        diffType,
        before: bVal,
        after: aVal
      });
    };

    const compareJson = (field: keyof RequestItem) => {
      const bStr = (before[field] as string) || '';
      const aStr = (after[field] as string) || '';

      let bObj: any = bStr;
      let aObj: any = aStr;
      try { bObj = JSON.parse(bStr); } catch { /* Keep raw */ }
      try { aObj = JSON.parse(aStr); } catch { /* Keep raw */ }

      const hasChanges = JSON.stringify(bObj) !== JSON.stringify(aObj);
      let diffType: 'added' | 'removed' | 'modified' | 'unchanged' = 'unchanged';
      if (hasChanges) {
        if (!bStr && aStr) diffType = 'added';
        else if (bStr && !aStr) diffType = 'removed';
        else diffType = 'modified';
        changedFields.push(String(field));
      }

      fieldDiffs.push({
        field: String(field),
        hasChanges,
        diffType,
        before: bObj,
        after: aObj
      });
    };

    // Compare fields
    compareSimple('method');
    compareSimple('url');
    compareSimple('name');
    compareJson('headers');
    compareJson('params');
    compareJson('body');
    compareJson('authConfig');
    compareSimple('preScript');
    compareSimple('testScript');

    return {
      hasDifferences: changedFields.length > 0,
      fieldDiffs,
      summary: {
        totalChanges: changedFields.length,
        changedFields
      }
    };
  }

  public exportToGitDirectory(
    data: { collection: Collection; requests: RequestItem[] },
    outputDir: string
  ): { success: boolean; exportedFiles: string[] } {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const exportedFiles: string[] = [];

    // 1. Write collection.json
    const collectionFile = path.join(outputDir, 'collection.json');
    fs.writeFileSync(collectionFile, JSON.stringify(data.collection, null, 2), 'utf-8');
    exportedFiles.push(collectionFile);

    // 2. Write requests directory
    const reqDir = path.join(outputDir, 'requests');
    if (!fs.existsSync(reqDir)) {
      fs.mkdirSync(reqDir, { recursive: true });
    }

    for (const req of data.requests) {
      const sanitizedId = req.id || req.name.toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
      const reqFile = path.join(reqDir, `${sanitizedId}.json`);
      fs.writeFileSync(reqFile, JSON.stringify(req, null, 2), 'utf-8');
      exportedFiles.push(reqFile);
    }

    // 3. Write .gitignore
    const gitignoreFile = path.join(outputDir, '.gitignore');
    const gitignoreContent = `# DevPilot API Studio Version Control
# Masked Secrets & Local Overrides
*.secrets.json
*.local.json
.DS_Store
`;
    fs.writeFileSync(gitignoreFile, gitignoreContent, 'utf-8');
    exportedFiles.push(gitignoreFile);

    // 4. Write README.md
    const readmeFile = path.join(outputDir, 'README.md');
    const endpointRows = data.requests
      .map(
        (r) =>
          `| \`${r.method}\` | \`${r.url}\` | ${r.name} |`
      )
      .join('\n');

    const readmeContent = `# ${data.collection.name}

${data.collection.description || 'API endpoints managed with DevPilot API Studio.'}

## Endpoints

| Method | URL | Name |
| :---: | :--- | :--- |
${endpointRows}

---
*Versioned with DevPilot API Studio Git Engine*
`;
    fs.writeFileSync(readmeFile, readmeContent, 'utf-8');
    exportedFiles.push(readmeFile);

    return {
      success: true,
      exportedFiles
    };
  }
}
