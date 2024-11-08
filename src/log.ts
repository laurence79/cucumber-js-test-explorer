import * as vscode from 'vscode';

const log = vscode.window.createOutputChannel('Cucumber JS Test Runner', {
  log: true,
});

export default log;
