import * as vscode from 'vscode';
import { ConfigInstance } from './config/instance';

export interface TestContext {
  readonly controller: vscode.TestController;
  readonly config: ConfigInstance;
}
