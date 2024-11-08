import * as messages from '@cucumber/messages';
import { IRunConfiguration } from '@cucumber/cucumber/api';
import {
  CancellationToken,
  ConfigToken,
  ExecutionLogger,
  TestCaseFinished,
  TestCaseStarted,
  TestStepFinished,
  TestStepStarted,
} from './types';
import execute, { ExecuteOptions } from './execute';
import MessagesNavigator from './messagesNavigator';
import executeDebug from './executeDebug';
import { getErrorMessage } from './util';
import { configForToken } from './config';

export interface RunTestsOutputHandlers {
  debuggerListening: (url: string) => void;
  testCaseStarted: (testCaseStarted: TestCaseStarted) => void;
  testCaseFinished: (testCaseFinished: TestCaseFinished) => void;
  testStepStarted: (testStepStarted: TestStepStarted) => void;
  testStepFinished: (testStepFinished: TestStepFinished) => void;
}

export interface RunTestsOptions {
  readonly cancellationToken: CancellationToken;
  readonly configToken: ConfigToken;
  readonly cwd: string;
  readonly log: ExecutionLogger;
  readonly names?: string[];
  readonly outputHandlers: RunTestsOutputHandlers;
  readonly paths?: string[];
  readonly shouldDebug: boolean;
}

const runTests = async ({
  cancellationToken,
  configToken,
  cwd,
  log,
  names,
  outputHandlers,
  paths,
  shouldDebug,
}: RunTestsOptions): Promise<{
  success: boolean;
  errors: string[];
  otherOutput: string[];
}> => {
  const baseConfig = configForToken(configToken);

  const config: IRunConfiguration = {
    ...baseConfig,
    sources: {
      ...baseConfig.sources,
      ...(paths ? { paths } : {}),
      ...(names ? { names } : {}),
    },
  };

  const messages: messages.Envelope[] = [];
  const errors: string[] = [];
  const otherOutput: string[] = [];

  const options: ExecuteOptions = {
    log,
    cancellationToken,
    cwd,
    config,
    onErrorLine: text => {
      errors.push(text);
    },
    onMessage: message => {
      messages.push(message);

      if (message.testCaseStarted) {
        outputHandlers.testCaseStarted(
          new MessagesNavigator(messages).testCaseStarted(
            message.testCaseStarted,
          ),
        );
      }

      if (message.testStepStarted) {
        outputHandlers.testStepStarted(
          new MessagesNavigator(messages).testStepStarted(
            message.testStepStarted,
          ),
        );
      }

      if (message.testStepFinished) {
        outputHandlers.testStepFinished(
          new MessagesNavigator(messages).testStepFinished(
            message.testStepFinished,
          ),
        );
      }

      if (message.testCaseFinished) {
        outputHandlers.testCaseFinished(
          new MessagesNavigator(messages).testCaseFinished(
            message.testCaseFinished,
          ),
        );
      }
    },
    onOutputLine: text => {
      otherOutput.push(text);
    },
  };

  try {
    let success: boolean;
    if (shouldDebug) {
      success = await executeDebug({
        ...options,
        onDebuggerListening: url => {
          outputHandlers.debuggerListening(url);
        },
      });
    } else {
      success = await execute(options);
    }

    return {
      success,
      errors,
      otherOutput,
    };
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);

    return {
      success: false,
      errors: [errorMessage, ...errors],
      otherOutput,
    };
  }
};

export default runTests;
