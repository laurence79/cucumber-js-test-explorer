import * as vscode from 'vscode';
import { ExtensionConfig } from './config/extension';

export interface TestContext {
  readonly controller: vscode.TestController;
  readonly extensionConfig: ExtensionConfig;
  readonly workspace: vscode.WorkspaceFolder;
}
