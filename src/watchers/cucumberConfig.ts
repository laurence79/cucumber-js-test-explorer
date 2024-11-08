import * as vscode from 'vscode';
import { recycleRootItem } from '../test-tree';
import { ExtensionConfig } from '../config/extension';

const configFilesGlob = (extensionConfig: ExtensionConfig) => {
  const files = [
    extensionConfig.configFile,
    'cucumber.json',
    'cucumber.yaml',
    'cucumber.yml',
    'cucumber.js',
    'cucumber.cjs',
    'cucumber.mjs',
  ].compact();

  return `{${files.join()}}`;
};

const cucumberConfigWatcher = (
  controller: vscode.TestController,
  workspace: vscode.WorkspaceFolder,
  extensionConfig: ExtensionConfig,
) => {
  const pattern = new vscode.RelativePattern(
    extensionConfig.baseUri,
    configFilesGlob(extensionConfig),
  );

  const watcher = vscode.workspace.createFileSystemWatcher(pattern);

  const refresh = () => {
    recycleRootItem(controller, workspace, extensionConfig);
  };

  watcher.onDidDelete(refresh);
  watcher.onDidCreate(refresh);
  watcher.onDidChange(refresh);

  return watcher;
};

export default cucumberConfigWatcher;
