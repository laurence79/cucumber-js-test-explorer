import * as vscode from 'vscode';
import { ExtensionConfig } from './config/extension';
import resolveHandler from './resolveHandler';
import runHandler from './runHandler';
import { TestContext } from './testContext';
import { setCucumberConfigStale } from './config/cucumber';
import { recycleRootItem } from './test-tree';
import watchers from './watchers';

const testController = (
  workspace: vscode.WorkspaceFolder,
  extensionConfig: ExtensionConfig,
) => {
  const controller = vscode.tests.createTestController(
    `cucumber-${workspace.name}-${extensionConfig.name}`,
    `Cucumber Test Provider (${extensionConfig.name})`,
  );

  const context: TestContext = {
    controller,
    extensionConfig,
    workspace,
  };

  controller.resolveHandler = resolveHandler(context);

  controller.refreshHandler = () => {
    setCucumberConfigStale(extensionConfig);
    recycleRootItem(controller, extensionConfig);
  };

  recycleRootItem(controller, extensionConfig);

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

  return [controller, ...watchers(controller, extensionConfig)];
};

export default testController;
