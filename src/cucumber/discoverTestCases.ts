import executeDryRun from './executeDryRun';
import { CancellationToken, ConfigToken, ExecutionLogger } from './types';
import MessagesNavigator from './messagesNavigator';
import { configForToken } from './config';

const discoverTestCases = async (
  cwd: string,
  configToken: ConfigToken,
  log: ExecutionLogger,
  cancellationToken?: CancellationToken,
) => {
  const config = configForToken(configToken);

  const result = await executeDryRun(cwd, config, log, cancellationToken);

  if (!result.success) {
    return result;
  }

  return {
    success: true as const,
    testCases: new MessagesNavigator(result.messages).allTestCases(),
  };
};

export default discoverTestCases;
