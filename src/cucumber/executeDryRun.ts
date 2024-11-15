import { EOL } from 'os';
import * as messages from '@cucumber/messages';
import execute, { ExecuteOptions } from './execute';
import { getErrorMessage } from './util';

type DryRunResult =
  | {
      success: true;
      messages: messages.Envelope[];
    }
  | {
      success: false;
      error: string;
    };

type ExecuteDryRunOptions = Pick<
  ExecuteOptions,
  'cwd' | 'config' | 'log' | 'cancellationToken' | 'additionalEnv'
>;

const executeDryRun = async (
  options: ExecuteDryRunOptions,
): Promise<DryRunResult> => {
  const messages: messages.Envelope[] = [];
  const errors: string[] = [];

  const { log } = options;

  try {
    const success = await execute({
      ...options,
      config: {
        ...options.config,
        runtime: {
          ...options.config.runtime,
          dryRun: true,
        },
        formats: {
          files: {},
          publish: false,
          options: {},
          stdout: 'message',
        },
      },
      onOutputLine: log.trace.bind(log),
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
