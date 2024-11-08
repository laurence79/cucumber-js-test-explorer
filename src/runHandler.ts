import { EOL } from 'os';
import * as vscode from 'vscode';
import * as cucumber from './cucumber';
import log from './log';
import { getRootItem, getMetaDataForTestItem } from './test-tree';
import createResultsHandlers from './results-handlers/create';
import { TestContext } from './testContext';
import { getCucumberConfig } from './config/cucumber';

const RUN_EOL = '\r\n';

const runOutputLog =
  (run: vscode.TestRun) =>
  (...lines: string[]) => {
    lines.forEach(line => {
      run.appendOutput(line + RUN_EOL);
    });
  };

const escapeRegExp = (text: string) => {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const getRelativePath = (base: vscode.Uri, uri: vscode.Uri): string => {
  return uri.fsPath.replace(base.fsPath, '').slice(1);
};

const flattenTestItem = (
  testItem: vscode.TestItem,
  exclude: readonly vscode.TestItem[] | undefined,
): vscode.TestItem[] => {
  const items: vscode.TestItem[] = [testItem];

  // recursively add descendants
  // eslint-disable-next-line @typescript-eslint/prefer-for-of
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    if (exclude?.includes(item)) {
      continue;
    }
    item.children.forEach(child => items.push(child));
  }

  return items;
};

const getIncludedTestItemsForTestRunRequest = (
  controller: vscode.TestController,
  request: vscode.TestRunRequest,
): vscode.TestItem[] => {
  const items: vscode.TestItem[] = [];

  if (request.include) {
    request.include.forEach(test =>
      items.push(...flattenTestItem(test, request.exclude)),
    );
  } else {
    items.push(...flattenTestItem(getRootItem(controller), request.exclude));
  }

  return items;
};

const runHandler = ({
  workspace,
  extensionConfig,
  controller,
}: TestContext) => {
  return async (
    shouldDebug: boolean,
    request: vscode.TestRunRequest,
    cancellationToken: vscode.CancellationToken,
  ) => {
    const name = `${request.include?.map(i => i.label).join(', ') ?? 'All'} (${workspace.name} ${extensionConfig.name})`;
    const run = controller.createTestRun(request, name, true);

    const queue = getIncludedTestItemsForTestRunRequest(controller, request);
    const done: vscode.TestItem[] = [];

    queue.forEach(item => {
      run.enqueued(item);
    });

    const configToken = await getCucumberConfig(extensionConfig);

    while (queue.length > 0 && !cancellationToken.isCancellationRequested) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const item = queue.shift()!;

      if (done.includes(item)) continue;
      if (!item.uri) continue;

      const affectedItems = flattenTestItem(item, request.exclude);

      affectedItems.forEach(test => {
        run.started(test);
      });

      runOutputLog(run)(
        `Running ${String(affectedItems.length)} item(s) from "${item.uri.fsPath}"`,
        '',
      );

      const meta = getMetaDataForTestItem(item);
      const names =
        !meta || 'feature' in meta
          ? []
          : [`^${escapeRegExp(meta.pickle().scenario().$.name)}$`];

      const start = Date.now();

      const { success, errors } = await cucumber.runTests({
        outputHandlers: createResultsHandlers(workspace, controller, run),
        cancellationToken,
        configToken,
        cwd: extensionConfig.baseUri.fsPath,
        log,
        names,
        paths: [getRelativePath(extensionConfig.baseUri, item.uri)],
        shouldDebug,
      });

      if (!success) {
        const errorMessage = errors.join(EOL);
        runOutputLog(run)('', 'X FAILED (error)', '', ...errors);

        const duration = Date.now() - start;
        const message = new vscode.TestMessage(errorMessage);

        affectedItems.forEach(test => {
          run.errored(test, message, duration);
        });
      }

      done.push(...affectedItems);
    }

    run.end();
  };
};

export default runHandler;
