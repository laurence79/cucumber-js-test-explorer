import * as vscode from 'vscode';

const debuggerListening =
  (workspace: vscode.WorkspaceFolder) => (url: string) => {
    vscode.debug.startDebugging(workspace, {
      type: 'node',
      request: 'attach',
      name: 'Attach to Cucumber',
      address: url,
      localRoot: '${workspaceFolder}',
      remoteRoot: '${workspaceFolder}',
      protocol: 'inspector',
      skipFiles: ['<node_internals>/**'],
    });
  };

export default debuggerListening;
