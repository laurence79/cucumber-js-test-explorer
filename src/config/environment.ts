import * as vscode from 'vscode';
import { parse } from 'dotenv';
import log from '../log';

const readEnv = async (
  env: Readonly<Record<string, string>> | undefined,
  baseUri: vscode.Uri,
  envFiles: readonly string[] | undefined,
  cancellation?: vscode.CancellationToken,
): Promise<Readonly<Record<string, string>> | undefined> => {
  if (!env && (!envFiles || envFiles.length === 0)) {
    return undefined;
  }

  const parsedEnvs = await Promise.all(
    envFiles?.map(async file => {
      const fileUri = vscode.Uri.joinPath(baseUri, file);

      log.debug('Reading env file', { path: fileUri.fsPath });

      const data = Buffer.from(await vscode.workspace.fs.readFile(fileUri));

      if (cancellation?.isCancellationRequested) {
        throw new Error('Cancelled');
      }

      return parse(data);
    }) ?? [],
  );

  const out = env ?? {};

  parsedEnvs.forEach(vars => {
    Object.assign(out, vars);
  });

  return out;
};

export default readEnv;
