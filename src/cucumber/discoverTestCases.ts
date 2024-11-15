import executeDryRun from './executeDryRun';
import { CancellationToken, ExecutionLogger } from './types';
import MessagesNavigator from './messagesNavigator';
import { configForToken, ConfigToken } from './config';

const discoverTestCases = async (
  cwd: string,
  configToken: ConfigToken,
  log: ExecutionLogger,
  cancellationToken?: CancellationToken,
  additionalEnv?: Readonly<Record<string, string>>,
) => {
  log.debug('Discovering test cases');

  const config = configForToken(configToken);

  const result = await executeDryRun({
    cwd,
    config,
    log,
    cancellationToken,
    additionalEnv,
  });

  if (!result.success) {
    return result;
  }

  const testCases = new MessagesNavigator(result.messages).allTestCases();

  log.info('Test cases discovered', {
    testCases: testCases
      .map(t => t.pickle())
      .groupBy(p => p.document())
      .map(r => ({
        document: r.key.$.uri,
        scenarios: r.values.map(v => v.$.name),
      })),
  });

  return {
    success: true as const,
    testCases,
  };
};

export default discoverTestCases;
