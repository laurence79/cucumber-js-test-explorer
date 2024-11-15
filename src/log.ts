import * as vscode from 'vscode';

const log = vscode.window.createOutputChannel('Cucumber JS Test Explorer', {
  log: true,
});

export default log;
