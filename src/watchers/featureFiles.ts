import * as vscode from 'vscode';
import { recycleRootItem, removeDocumentFromTree } from '../test-tree';
import { ExtensionConfig } from '../config/extension';

const featureFileWatcher = (
  controller: vscode.TestController,
  workspace: vscode.WorkspaceFolder,
  extensionConfig: ExtensionConfig,
) => {
  const pattern = new vscode.RelativePattern(
    extensionConfig.baseUri,
    '**/*.feature',
  );

  const watcher = vscode.workspace.createFileSystemWatcher(pattern);

  const refresh = () => {
    recycleRootItem(controller, workspace, extensionConfig);
  };

  watcher.onDidDelete(uri => {
    removeDocumentFromTree(controller, uri);
  });
  watcher.onDidCreate(refresh);
  watcher.onDidChange(refresh);

  return watcher;
};

export default featureFileWatcher;
