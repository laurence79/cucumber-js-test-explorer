import { exec, ExecOptions } from 'child_process';
import type {
  ILoadConfigurationOptions,
  IResolvedConfiguration,
  IRunConfiguration,
} from '@cucumber/cucumber/api';
import { CancellationToken, ExecutionLogger } from './types';

interface ReadConfigOptions {
  readonly cwd: string;
  readonly configFile?: string;
  readonly profiles?: readonly string[];
  readonly log: ExecutionLogger;
  readonly env: Readonly<Record<string, string>> | undefined;
  readonly cancellation?: CancellationToken;
}

const tokenKey: unique symbol = Symbol();

export interface ConfigToken {
  [tokenKey]: true;
}

const configStore = new WeakMap<ConfigToken, IRunConfiguration>();

export const configForToken = (token: ConfigToken): IRunConfiguration => {
  const maybe = configStore.get(token);

  if (!maybe) {
    throw new Error('Invalid config token');
  }

  return maybe;
};

const js = (options: ILoadConfigurationOptions) => `
  require("@cucumber/cucumber/api")
    .loadConfiguration(${JSON.stringify(options)})
    .then(config => console.log(JSON.stringify(config)))
`;

export const readConfig = async ({
  cwd,
  configFile,
  profiles,
  env,
  log,
  cancellation,
}: ReadConfigOptions): Promise<ConfigToken> => {
  log.debug(`Reading cucumber configuration in ${cwd}`);

  const commandOptions: ILoadConfigurationOptions = {
    ...(configFile ? { file: configFile } : {}),
    ...(profiles ? { profiles: [...profiles] } : {}),
  };

  const command = `node -e '${js(commandOptions)}'`;

  const execOptions: ExecOptions = {
    cwd,
    ...(env
      ? {
          env: {
            ...process.env,
            ...env,
          },
        }
      : {}),
  };

  log.debug('Running command', { command, execOptions });

  return new Promise((resolve, reject) => {
    const process = exec(command, execOptions, (error, stdout) => {
      if (cancellation?.isCancellationRequested) {
        reject(new Error('Cancelled'));
        return;
      }

      if (error) {
        log.error('Failed to read cucumber config', { error });

        reject(error);

        return;
      }

      const result = JSON.parse(stdout) as IResolvedConfiguration;
      log.info('Cucumber configuration read', { result });

      const token: ConfigToken = { [tokenKey]: true };
      configStore.set(token, result.runConfiguration);

      resolve(token);
    });

    cancellation?.onCancellationRequested(() => {
      process.kill();
      reject(new Error('Cancelled'));
    });
  });
};
