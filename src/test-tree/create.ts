import * as vscode from 'vscode';
import * as cucumber from '../cucumber';
import log from '../log';
import { ConfigInstance, ConfigInstanceResolved } from '../config/instance';
import { getErrorMessage } from '../util/errors';
import promiseWithResolvers from '../util/promiseWithResolvers';
import { getRootItem, recycleRootItem } from './root';
import ensureTestCaseInTree from './testCaseNode';
import { removeDocumentFromTree } from './documentNode';

export interface Tree extends vscode.Disposable {
  firstLoad(): Promise<void>;
}

const createTestTree = (
  controller: vscode.TestController,
  config: ConfigInstance,
): Tree => {
  recycleRootItem(controller, config);

  let resolvedConfig: ConfigInstanceResolved | Error | undefined;
  let refreshCancellation: vscode.CancellationTokenSource | undefined;
  let watcher: vscode.FileSystemWatcher | undefined = undefined;

  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  const firstLoad = promiseWithResolvers<void>();

  const refresh = async () => {
    refreshCancellation?.cancel();
    refreshCancellation?.dispose();
    refreshCancellation = new vscode.CancellationTokenSource();

    const rootItem = getRootItem(controller);

    rootItem.children.forEach(child => {
      rootItem.children.delete(child.id);
    });

    if (!resolvedConfig) return;

    if (resolvedConfig instanceof Error) {
      rootItem.error = getErrorMessage(resolvedConfig);
      return;
    }

    rootItem.busy = true;

    const discoveryResult = await cucumber.discoverTestCases(
      config.baseUri.fsPath,
      resolvedConfig.cucumberConfig,
      log,
      refreshCancellation.token,
      resolvedConfig.env,
    );

    if (refreshCancellation.token.isCancellationRequested) {
      rootItem.busy = false;
      return;
    }

    refreshCancellation.dispose();
    refreshCancellation = undefined;

    if (!discoveryResult.success) {
      log.warn(`Failed to discover tests`);
      rootItem.error = discoveryResult.error;
      rootItem.busy = false;
      return;
    }

    rootItem.error = undefined;

    discoveryResult.testCases.forEach(testCase => {
      ensureTestCaseInTree(controller, testCase);
    });

    rootItem.busy = false;

    if (!watcher) {
      const pattern = new vscode.RelativePattern(
        config.baseUri,
        '**/*.feature',
      );

      watcher = vscode.workspace.createFileSystemWatcher(pattern);

      watcher.onDidDelete(uri => {
        removeDocumentFromTree(controller, uri);
      });
      watcher.onDidCreate(refresh);
      watcher.onDidChange(refresh);
    }
  };

  const configResolutionSubscriber = config.subscribe(resolved => {
    resolvedConfig = resolved;
    void refresh().finally(() => {
      firstLoad.resolve();
    });
  });

  return {
    dispose: () => {
      firstLoad.resolve();
      watcher?.dispose();
      configResolutionSubscriber[Symbol.dispose]();
      refreshCancellation?.dispose();
    },
    firstLoad: () => firstLoad.promise,
  };
};

export default createTestTree;
