import { exec } from 'child_process';
import type {
  ILoadConfigurationOptions,
  IResolvedConfiguration,
  IRunConfiguration,
} from '@cucumber/cucumber/api';
import { ConfigToken, ExecutionLogger } from './types';

interface ReadConfigOptions {
  readonly cwd: string;
  readonly configFile?: string;
  readonly profiles?: string[];
  readonly log: ExecutionLogger;
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

export const readConfig = ({
  cwd,
  configFile,
  profiles,
  log,
}: ReadConfigOptions): Promise<ConfigToken> => {
  log.debug(`Reading cucumber configuration in ${cwd}`);

  const commandOptions: ILoadConfigurationOptions = {
    ...(configFile ? { file: configFile } : {}),
    ...(profiles ? { profiles } : {}),
  };

  const command = `node -e '${js(commandOptions)}'`;

  log.debug('Running command', { command, cwd });

  return new Promise((resolve, reject) => {
    exec(command, { cwd }, (error, stdout, stderr) => {
      if (error?.code) {
        log.error('Failed to read cucumber config', { error, stderr });
        reject(
          new Error(
            `Failed to read cucumber config. Error code ${String(error.code)}. ${stderr}`,
          ),
        );
        return;
      }

      const result = JSON.parse(stdout) as IResolvedConfiguration;
      log.info('Cucumber configuration read', { result });

      const token: ConfigToken = {};
      configStore.set(token, result.runConfiguration);

      resolve(token);
    });
  });
};
