export function parseDataFile(content: string, format: 'json' | 'csv'): Record<string, any>[] {
  const trimmed = content.trim();
  if (!trimmed) return [];

  if (format === 'json') {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter((item) => typeof item === 'object' && item !== null);
      }
      if (typeof parsed === 'object' && parsed !== null) {
        return [parsed];
      }
      return [];
    } catch (err: any) {
      throw new Error(`Invalid JSON iteration data: ${err.message}`);
    }
  }

  // Parse CSV
  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    throw new Error('CSV must contain a header row and at least one data row');
  }

  const parseCsvLine = (line: string): string[] => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim().replace(/^["']|["']$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^["']|["']$/g, ''));
    return values;
  };

  const headers = parseCsvLine(lines[0]);
  const records: Record<string, any>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rowValues = parseCsvLine(lines[i]);
    const record: Record<string, any> = {};
    for (let h = 0; h < headers.length; h++) {
      const headerName = headers[h];
      record[headerName] = rowValues[h] !== undefined ? rowValues[h] : '';
    }
    records.push(record);
  }

  return records;
}
