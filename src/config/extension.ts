import * as vscode from 'vscode';
import log from '../log';

interface DeserializedConfig {
  readonly name: string;
  readonly cwd?: string;
  readonly configFile?: string;
  readonly profiles?: string[];
}

export interface ExtensionConfig extends DeserializedConfig {
  readonly baseUri: vscode.Uri;
}

export const readExtensionConfig = (
  workspaceUri: vscode.Uri,
): ExtensionConfig[] => {
  log.debug('Reading extension configuration');
  const configuration = vscode.workspace.getConfiguration(
    'cucumberJsTestRunner',
    workspaceUri,
  );

  const config = configuration.get<DeserializedConfig[]>('virtualFolders');
  log.info('Extension configuration read', { config });

  return (
    config?.map(item => ({
      ...item,
      baseUri: item.cwd
        ? vscode.Uri.joinPath(workspaceUri, item.cwd)
        : workspaceUri,
    })) ?? []
  );
};
