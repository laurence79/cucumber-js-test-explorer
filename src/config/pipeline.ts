import path from 'path';
import * as vscode from 'vscode';
import { ReadonlySubject } from '../util/pub-sub';
import log from '../log';
import PubSub from '../util/pub-sub/PubSub';
import createConfigInstance, { ConfigInstance } from './instance';
import { MainConfig, SharedConfig } from './types';

export interface ConfigPipeline extends vscode.Disposable {
  instances: ReadonlySubject<ConfigInstance[]>;
}

const readMainConfig = (workspaceUri: vscode.Uri): MainConfig | undefined => {
  log.debug('Reading extension configuration');

  const configuration = vscode.workspace.getConfiguration(
    undefined,
    workspaceUri,
  );

  const main = configuration.get<MainConfig>('cucumberJsTestExplorer');

  log.info('Extension configuration read', { config: main });

  return main;
};

const mergeMainIntoVirtualFolder = (
  main: SharedConfig,
  item: SharedConfig,
): SharedConfig => {
  const configFile = item.configFile ?? main.configFile;

  const cwd = item.cwd ?? main.cwd;

  const profiles =
    main.profiles || item.profiles
      ? [...(main.profiles ?? []), ...(item.profiles ?? [])]
      : undefined;

  const env = main.env || item.env ? { ...main.env, ...item.env } : {};

  const envFiles =
    main.envFiles || item.envFiles
      ? [...(main.envFiles ?? []), ...(item.envFiles ?? [])]
      : undefined;

  return {
    configFile,
    cwd,
    profiles,
    envFiles,
    env,
  };
};

const createConfigPipeline = (): ConfigPipeline => {
  log.debug('Creating configuration pipeline');

  const load = () => {
    return (
      vscode.workspace.workspaceFolders?.flatMap(workspace => {
        const main = readMainConfig(workspace.uri);

        if (!main) return [];

        if (!main.virtualFolders) {
          const baseUri = main.cwd
            ? vscode.Uri.joinPath(workspace.uri, main.cwd)
            : workspace.uri;

          return [
            createConfigInstance(
              path.basename(baseUri.fsPath),
              workspace,
              main,
            ),
          ];
        }

        return main.virtualFolders.map(item => {
          const merged = mergeMainIntoVirtualFolder(main, item);

          return createConfigInstance(item.name, workspace, merged);
        });
      }) ?? []
    );
  };

  const instances = PubSub.publisher(load());

  const changeSubscription = vscode.workspace.onDidChangeConfiguration(() => {
    log.info('Extension configuration changed');

    instances.next(load());
  });

  log.info('Configuration pipeline created');

  return {
    instances,
    dispose: () => {
      instances.read().forEach(instance => {
        instance.dispose();
      });

      changeSubscription.dispose();

      log.debug('Configuration pipeline disposed');
    },
  };
};

export default createConfigPipeline;
