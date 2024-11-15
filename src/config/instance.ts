import * as vscode from 'vscode';
import * as cucumber from '../cucumber';
import { ReadonlyOptionalSubject } from '../util/pub-sub';
import PubSub from '../util/pub-sub/PubSub';
import log from '../log';
import { coerceError } from '../util/errors';
import { SharedConfig } from './types';
import readEnv from './environment';

export interface ConfigInstanceResolved {
  readonly env?: Readonly<Record<string, string>>;
  readonly profiles?: readonly string[];
  readonly cucumberConfig: cucumber.ConfigToken;
}

export interface ConfigInstance
  extends ReadonlyOptionalSubject<ConfigInstanceResolved | Error>,
    vscode.Disposable {
  readonly name: string;
  readonly baseUri: vscode.Uri;
  readonly workspace: vscode.WorkspaceFolder;
  refresh: (
    cancellation: vscode.CancellationToken,
  ) => Promise<ConfigInstanceResolved | Error>;
  cacheOrResolve: () => Promise<ConfigInstanceResolved | Error>;
}

const configFilesGlob = (config: SharedConfig) => {
  const files = [
    config.configFile,
    'cucumber.json',
    'cucumber.yaml',
    'cucumber.yml',
    'cucumber.js',
    'cucumber.cjs',
    'cucumber.mjs',
    ...(config.envFiles ?? []),
  ].compact();

  return `{${files.join()}}`;
};

const resolve = async (
  config: SharedConfig,
  baseUri: vscode.Uri,
  cancellation?: vscode.CancellationToken,
) => {
  try {
    const env = await readEnv(
      config.env,
      baseUri,
      config.envFiles,
      cancellation,
    );

    const cucumberConfig = await cucumber.readConfig({
      cwd: baseUri.fsPath,
      configFile: config.configFile,
      profiles: config.profiles,
      env,
      log,
      cancellation,
    });

    return {
      env,
      profiles: config.profiles,
      cucumberConfig,
    } satisfies ConfigInstanceResolved;
  } catch (error: unknown) {
    return coerceError(error);
  }
};

const createConfigInstance = (
  name: string,
  workspace: vscode.WorkspaceFolder,
  config: SharedConfig,
): ConfigInstance => {
  log.debug('Creating configuration instance', { name, config });

  const subject = PubSub.publisher<ConfigInstanceResolved | Error>();

  const filesToWatch = PubSub.publisher<string>();

  const baseUri = config.cwd
    ? vscode.Uri.joinPath(workspace.uri, config.cwd)
    : workspace.uri;

  let refreshing: Promise<Error | ConfigInstanceResolved> | undefined;

  const refresh = async (cancellation?: vscode.CancellationToken) => {
    refreshing = resolve(config, baseUri, cancellation);
    const result = await refreshing;
    subject.next(result);
    filesToWatch.next(configFilesGlob(config));

    log.info('Configuration instance resolved', { name, result });

    return result;
  };

  let watcher: vscode.FileSystemWatcher | undefined = undefined;

  const filesToWatchSubscription = filesToWatch.subscribe(glob => {
    const pattern = new vscode.RelativePattern(baseUri, glob);

    watcher?.dispose();
    watcher = vscode.workspace.createFileSystemWatcher(pattern);

    watcher.onDidDelete(() => refresh());
    watcher.onDidCreate(() => refresh());
    watcher.onDidChange(() => refresh());
  });

  log.info('Configuration instance created', { name, config });

  return {
    ...subject,
    name,
    baseUri,
    workspace,
    cacheOrResolve: async () => {
      return refreshing ?? refresh();
    },
    refresh,
    dispose: () => {
      watcher?.dispose();
      filesToWatchSubscription[Symbol.dispose]();
    },
  };
};

export default createConfigInstance;
