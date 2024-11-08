import { EOL } from 'os';
import * as messages from '@cucumber/messages';
import { IRunConfiguration } from '@cucumber/cucumber/api';
import execute from './execute';
import { getErrorMessage } from './util';
import { CancellationToken, ExecutionLogger } from './types';

type DryRunResult =
  | {
      success: true;
      messages: messages.Envelope[];
    }
  | {
      success: false;
      error: string;
    };

const executeDryRun = async (
  cwd: string,
  cucumberConfig: IRunConfiguration,
  log: ExecutionLogger,
  cancellationToken?: CancellationToken,
): Promise<DryRunResult> => {
  const messages: messages.Envelope[] = [];
  const errors: string[] = [];

  try {
    const success = await execute({
      cancellationToken,
      log,
      cwd,
      config: {
        ...cucumberConfig,
        runtime: {
          ...cucumberConfig.runtime,
          dryRun: true,
        },
        formats: {
          files: {},
          publish: false,
          options: {},
          stdout: 'message',
        },
      },
      onOutputLine: log.debug.bind(log),
      onErrorLine: line => {
        log.error(line);
        errors.push(line);
      },
      onMessage: messages.push.bind(messages),
    });

    if (!success) {
      return {
        success,
        error: errors.join(EOL),
      };
    }
  } catch (error: unknown) {
    log.error(error instanceof Error ? error : getErrorMessage(error));
    errors.push(getErrorMessage(error));
    return {
      success: false,
      error: errors.join(EOL),
    };
  }

  return {
    success: true,
    messages,
  };
};

export default executeDryRun;
