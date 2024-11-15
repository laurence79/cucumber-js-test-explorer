import * as vscode from 'vscode';
import runHandler from './runHandler';
import { TestContext } from './testContext';
import createTestTree, { Tree } from './test-tree/create';
import { ConfigInstance } from './config/instance';
import { getErrorMessage } from './util/errors';
import log from './log';

const testController = (config: ConfigInstance): vscode.Disposable[] => {
  const controller = vscode.tests.createTestController(
    `cucumber-${config.name}`,
    `Cucumber Test Provider (${config.name})`,
  );

  let tree: Tree | undefined = undefined;

  controller.resolveHandler = async item => {
    if (!item) return;

    log.debug('Resolving item', {
      configName: config.name,
      itemLabel: item.label,
    });

    const result = await config.cacheOrResolve();

    if (result instanceof Error) {
      item.error = getErrorMessage(result);
    }

    await tree?.firstLoad();

    log.info('Item resolved', {
      configName: config.name,
      itemLabel: item.label,
    });
  };

  tree = createTestTree(controller, config);

  controller.refreshHandler = async cancellation => {
    await config.refresh(cancellation);
  };

  const context: TestContext = {
    controller,
    config: config,
  };

  controller.createRunProfile(
    'Run',
    vscode.TestRunProfileKind.Run,
    (request, token) => {
      void runHandler(context)(false, request, token);
    },
  );

  controller.createRunProfile(
    'Debug',
    vscode.TestRunProfileKind.Debug,
    (request, token) => {
      void runHandler(context)(true, request, token);
    },
  );

  return [controller, tree];
};

export default testController;
