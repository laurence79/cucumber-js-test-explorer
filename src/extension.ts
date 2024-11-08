import 'ts-array-extensions';
import * as vscode from 'vscode';
import { readExtensionConfig } from './config/extension';
import testController from './testController';

const disposeBag: vscode.Disposable[] = [];

const dispose = () => {
  disposeBag.forEach(d => {
    d.dispose();
  });
  disposeBag.length = 0;
};

const readConfigAndCreate = () => {
  vscode.workspace.workspaceFolders?.forEach(workspace => {
    readExtensionConfig(workspace.uri).forEach(config => {
      disposeBag.push(...testController(workspace, config));
    });
  });
};

export function activate() {
  readConfigAndCreate();

  vscode.workspace.onDidChangeConfiguration(() => {
    dispose();
    readConfigAndCreate();
  });
}

export function deactivate() {
  dispose();
}
