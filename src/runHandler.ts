import { EOL } from 'os';
import * as vscode from 'vscode';
import * as cucumber from './cucumber';
import log from './log';
import { getRootItem, getMetaDataForTestItem } from './test-tree';
import createResultsHandlers from './results-handlers/create';
import { TestContext } from './testContext';
import { getErrorMessage } from './util/errors';

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

const runHandler = ({ config, controller }: TestContext) => {
  return async (
    shouldDebug: boolean,
    request: vscode.TestRunRequest,
    cancellationToken: vscode.CancellationToken,
  ) => {
    const name = `${request.include?.map(i => i.label).join(', ') ?? 'All'} (${config.name})`;

    log.info('Beginning test run', { name });

    const run = controller.createTestRun(request, name, true);

    const queue = getIncludedTestItemsForTestRunRequest(controller, request);

    log.debug('Identified test items to run', {
      count: queue.length,
      ids: queue.map(q => q.id),
    });

    const configTokenResult = await config.cacheOrResolve();

    if (configTokenResult instanceof Error) {
      log.error('Test run failed because of a configuration problem', {
        error: configTokenResult,
      });

      queue.forEach(item => {
        run.errored(
          item,
          new vscode.TestMessage(getErrorMessage(configTokenResult)),
        );
      });

      run.end();
      return;
    }

    const done: vscode.TestItem[] = [];

    queue.forEach(item => {
      run.enqueued(item);
    });

    const outputHandlers = createResultsHandlers(
      config.workspace,
      controller,
      run,
    );

    while (queue.length > 0 && !cancellationToken.isCancellationRequested) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const item = queue.shift()!;

      if (done.includes(item)) continue;

      if (!item.uri) {
        log.warn('Skipping item because it has no Uri', { id: item.id });
        run.skipped(item);

        continue;
      }

      const affectedItems = flattenTestItem(item, request.exclude);

      log.info('Begin test item', { id: item.id });
      log.debug('Test item encompasses child items', {
        ids: affectedItems.map(i => i.id),
      });

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

      const { processSuccess, errors } = await cucumber.runTests({
        outputHandlers,
        cancellationToken,
        configToken: configTokenResult.cucumberConfig,
        cwd: config.baseUri.fsPath,
        log,
        names,
        paths: [getRelativePath(config.baseUri, item.uri)],
        shouldDebug,
        additionalEnv: configTokenResult.env,
      });

      if (!processSuccess) {
        log.warn('Tests failed with error', { itemId: item.id, errors });

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
