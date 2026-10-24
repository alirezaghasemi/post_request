import { runCli } from './cli-engine';

export * from './cli-engine';
export * from './reporters';
export * from './ci-generator';

if (require.main === module) {
  runCli(process.argv.slice(2)).then((exitCode) => {
    process.exit(exitCode);
  });
}
