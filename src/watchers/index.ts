import * as vscode from 'vscode';
import { ExtensionConfig } from '../config/extension';
import cucumberConfigWatcher from './cucumberConfig';
import featureFileWatcher from './featureFiles';

export default (
  controller: vscode.TestController,
  workspace: vscode.WorkspaceFolder,
  extensionConfig: ExtensionConfig,
) => [
  cucumberConfigWatcher(controller, workspace, extensionConfig),
  featureFileWatcher(controller, workspace, extensionConfig),
];
