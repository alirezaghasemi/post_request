import * as fs from 'node:fs';
import * as path from 'node:path';
import { HttpClientEngine } from '../main/network/http-client';
import { ScriptSandbox } from '../main/scripting/sandbox';
import { VariableResolver } from '../main/variables/resolver';
import { CollectionRunner } from '../main/runner/collection-runner';
import { PostmanImporter } from '../main/importers/postman-importer';
import { parseDataFile } from '../main/runner/data-parser';
import { generateJunitXml, generateJsonReport, generateCliTable } from './reporters';
import type { CollectionRunReport } from '../main/runner/report-exporter';
import type { RequestItem, Environment, Collection } from '../shared/types';

export interface CliOptions {
  command?: 'run' | 'help' | 'version';
  collectionPath: string;
  environmentPath?: string;
  dataPath?: string;
  iterations?: number;
  delayRequestMs?: number;
  bail?: boolean;
  reporters?: string[];
  junitExportPath?: string;
  jsonExportPath?: string;
  help?: boolean;
  version?: boolean;
}

export interface CliRunResult {
  exitCode: 0 | 1 | 2;
  report: CollectionRunReport & {
    runId: string;
    summary: {
      totalRequests: number;
      totalPassed: number;
      totalFailed: number;
      iterations: number;
    };
    steps: any[];
  };
  errorMessage?: string;
}

export function parseCliArgs(args: string[]): CliOptions {
  const result: CliOptions = {
    command: 'run',
    collectionPath: '',
    iterations: 1,
    delayRequestMs: 0,
    bail: false,
    reporters: ['cli']
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === 'run') {
      result.command = 'run';
      i++;
      if (i < args.length && !args[i].startsWith('-')) {
        result.collectionPath = args[i];
        i++;
      }
      continue;
    }

    if (arg === '-h' || arg === '--help') {
      result.command = 'help';
      result.help = true;
      i++;
      continue;
    }

    if (arg === '-v' || arg === '--version') {
      result.command = 'version';
      result.version = true;
      i++;
      continue;
    }

    if (arg === '-e' || arg === '--environment') {
      result.environmentPath = args[++i];
      i++;
      continue;
    }

    if (arg === '-d' || arg === '--data' || arg === '--iteration-data') {
      result.dataPath = args[++i];
      i++;
      continue;
    }

    if (arg === '-n' || arg === '--iterations' || arg === '--iteration-count') {
      result.iterations = parseInt(args[++i], 10) || 1;
      i++;
      continue;
    }

    if (arg === '--delay-request') {
      result.delayRequestMs = parseInt(args[++i], 10) || 0;
      i++;
      continue;
    }

    if (arg === '--bail') {
      result.bail = true;
      i++;
      continue;
    }

    if (arg === '--reporters') {
      const reps = args[++i];
      if (reps) {
        result.reporters = reps.split(',').map((r) => r.trim()).filter(Boolean);
      }
      i++;
      continue;
    }

    if (arg === '--reporter-junit-export') {
      result.junitExportPath = args[++i];
      i++;
      continue;
    }

    if (arg === '--reporter-json-export') {
      result.jsonExportPath = args[++i];
      i++;
      continue;
    }

    if (!result.collectionPath && !arg.startsWith('-')) {
      result.collectionPath = arg;
      i++;
      continue;
    }

    i++;
  }

  return result;
}

export class CliRunner {
  private httpClient: HttpClientEngine;
  private scriptSandbox: ScriptSandbox;
  private variableResolver: VariableResolver;
  private postmanImporter: PostmanImporter;

  constructor() {
    this.httpClient = new HttpClientEngine();
    this.scriptSandbox = new ScriptSandbox();
    this.variableResolver = new VariableResolver();
    this.postmanImporter = new PostmanImporter();
  }

  public async execute(options: CliOptions): Promise<CliRunResult> {
    const startedAt = new Date().toISOString();
    const defaultFailReport: any = {
      id: 'error-run',
      runId: 'error-run',
      collectionId: 'cli-collection',
      collectionName: 'Failed Collection Run',
      totalRequests: 0,
      totalPassed: 0,
      totalFailed: 1,
      totalTimeMs: 0,
      status: 'failed',
      iterations: options.iterations || 1,
      results: [],
      steps: [],
      summary: {
        totalRequests: 0,
        totalPassed: 0,
        totalFailed: 1,
        iterations: options.iterations || 1
      },
      startedAt,
      completedAt: new Date().toISOString()
    };

    try {
      if (!options.collectionPath) {
        return {
          exitCode: 2,
          errorMessage: 'Error: No collection file specified. Usage: devpilot run <collection.json>',
          report: defaultFailReport
        };
      }

      const collectionResolvedPath = path.resolve(process.cwd(), options.collectionPath);
      if (!fs.existsSync(collectionResolvedPath)) {
        return {
          exitCode: 2,
          errorMessage: `Error: Collection file not found at: ${collectionResolvedPath}`,
          report: defaultFailReport
        };
      }

      let rawCollectionJson: any;
      try {
        const fileContent = fs.readFileSync(collectionResolvedPath, 'utf-8');
        rawCollectionJson = JSON.parse(fileContent);
      } catch (err: any) {
        return {
          exitCode: 2,
          errorMessage: `Error parsing collection JSON: ${err.message}`,
          report: defaultFailReport
        };
      }

      // Load collection items
      let collection: Collection;
      let requests: RequestItem[];

      if (rawCollectionJson.info && Array.isArray(rawCollectionJson.item)) {
        // Postman format
        const imported = this.postmanImporter.importCollection(rawCollectionJson, 'cli-workspace');
        collection = imported.collection;
        requests = imported.requests;
      } else if (rawCollectionJson.requests && Array.isArray(rawCollectionJson.requests)) {
        // DevPilot collection export
        collection = rawCollectionJson.collection || {
          id: 'cli-collection',
          workspaceId: 'cli-workspace',
          name: rawCollectionJson.name || 'DevPilot Collection',
          description: '',
          variables: JSON.stringify(rawCollectionJson.variables || []),
          createdAt: startedAt,
          updatedAt: startedAt
        };
        requests = rawCollectionJson.requests;
      } else {
        return {
          exitCode: 2,
          errorMessage: 'Error: Unrecognized collection format. Expected Postman or DevPilot collection format.',
          report: defaultFailReport
        };
      }

      // Load environment
      let environment: Environment | undefined = undefined;
      if (options.environmentPath) {
        const envResolvedPath = path.resolve(process.cwd(), options.environmentPath);
        if (!fs.existsSync(envResolvedPath)) {
          return {
            exitCode: 2,
            errorMessage: `Error: Environment file not found at: ${envResolvedPath}`,
            report: defaultFailReport
          };
        }

        try {
          const envRaw = JSON.parse(fs.readFileSync(envResolvedPath, 'utf-8'));
          if (Array.isArray(envRaw.values)) {
            environment = this.postmanImporter.importEnvironment(envRaw, 'cli-workspace');
          } else if (Array.isArray(envRaw.variables)) {
            environment = {
              id: 'cli-env',
              workspaceId: 'cli-workspace',
              name: envRaw.name || 'CLI Environment',
              isActive: true,
              variables: envRaw.variables,
              createdAt: startedAt,
              updatedAt: startedAt
            };
          } else if (typeof envRaw === 'object' && envRaw !== null) {
            // Key-value map
            environment = {
              id: 'cli-env',
              workspaceId: 'cli-workspace',
              name: 'CLI Environment',
              isActive: true,
              variables: Object.entries(envRaw).map(([key, value]) => ({
                id: key,
                key,
                value: String(value),
                type: 'default',
                enabled: true
              })),
              createdAt: startedAt,
              updatedAt: startedAt
            };
          }
        } catch (err: any) {
          return {
            exitCode: 2,
            errorMessage: `Error parsing environment file: ${err.message}`,
            report: defaultFailReport
          };
        }
      }

      // Load Iteration Data
      let iterationData: Record<string, any>[] | undefined = undefined;
      if (options.dataPath) {
        const dataResolvedPath = path.resolve(process.cwd(), options.dataPath);
        if (!fs.existsSync(dataResolvedPath)) {
          return {
            exitCode: 2,
            errorMessage: `Error: Iteration data file not found at: ${dataResolvedPath}`,
            report: defaultFailReport
          };
        }

        try {
          const rawContent = fs.readFileSync(dataResolvedPath, 'utf-8');
          const format = dataResolvedPath.toLowerCase().endsWith('.csv') ? 'csv' : 'json';
          iterationData = parseDataFile(rawContent, format);
        } catch (err: any) {
          return {
            exitCode: 2,
            errorMessage: `Error parsing iteration data file: ${err.message}`,
            report: defaultFailReport
          };
        }
      }

      const runner = new CollectionRunner({
        httpClient: this.httpClient,
        scriptSandbox: this.scriptSandbox,
        variableResolver: this.variableResolver
      });

      const baseReport = await runner.run({
        inMemoryCollection: collection,
        inMemoryRequests: requests,
        inMemoryEnvironment: environment,
        iterations: options.iterations || 1,
        delayMs: options.delayRequestMs || 0,
        stopOnError: options.bail || false,
        iterationData
      });

      const enhancedReport: any = {
        ...baseReport,
        runId: baseReport.id,
        summary: {
          totalRequests: baseReport.totalRequests,
          totalPassed: baseReport.totalPassed,
          totalFailed: baseReport.totalFailed,
          iterations: baseReport.iterations
        },
        steps: baseReport.results
      };

      const hasFailures = baseReport.totalFailed > 0 || baseReport.status === 'failed';
      const exitCode: 0 | 1 | 2 = hasFailures ? 1 : 0;

      // Handle Reporters
      const reporters = options.reporters || ['cli'];

      if (options.junitExportPath || reporters.includes('junit')) {
        const xml = generateJunitXml(enhancedReport);
        if (options.junitExportPath) {
          const outDir = path.dirname(path.resolve(process.cwd(), options.junitExportPath));
          if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
          fs.writeFileSync(path.resolve(process.cwd(), options.junitExportPath), xml, 'utf-8');
        }
      }

      if (options.jsonExportPath || reporters.includes('json')) {
        const json = generateJsonReport(enhancedReport);
        if (options.jsonExportPath) {
          const outDir = path.dirname(path.resolve(process.cwd(), options.jsonExportPath));
          if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
          fs.writeFileSync(path.resolve(process.cwd(), options.jsonExportPath), json, 'utf-8');
        }
      }

      return {
        exitCode,
        report: enhancedReport
      };
    } catch (err: any) {
      return {
        exitCode: 2,
        errorMessage: `Unexpected CLI runtime error: ${err.message}`,
        report: defaultFailReport
      };
    }
  }
}

export async function runCli(argv: string[]): Promise<number> {
  const options = parseCliArgs(argv);

  if (options.command === 'help' || options.help) {
    console.log(`
DevPilot API Studio — Headless CLI Runner

Usage:
  devpilot run <collection.json> [options]

Options:
  -e, --environment <path>       Path to environment JSON file
  -d, --data <path>              Path to iteration data file (CSV or JSON)
  -n, --iterations <number>      Number of iteration runs (default: 1)
  --delay-request <ms>           Delay between requests in milliseconds (default: 0)
  --bail                         Stop the runner immediately on first test failure
  --reporters <list>             Comma-separated reporters: cli,junit,json (default: cli)
  --reporter-junit-export <path> Output file path for JUnit XML report
  --reporter-json-export <path>  Output file path for JSON report
  -h, --help                     Display this help message
  -v, --version                  Display version information

Exit Codes:
  0: All requests and assertions passed successfully
  1: One or more test assertions failed
  2: Runtime error, invalid configuration, or file not found
`);
    return 0;
  }

  if (options.command === 'version' || options.version) {
    console.log('DevPilot API Studio CLI v0.1.0');
    return 0;
  }

  const runner = new CliRunner();
  const result = await runner.execute(options);

  if (options.reporters?.includes('cli') || !options.reporters) {
    if (result.errorMessage) {
      console.error(result.errorMessage);
    } else {
      console.log(generateCliTable(result.report));
    }
  }

  return result.exitCode;
}
