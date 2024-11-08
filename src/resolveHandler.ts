import * as vscode from 'vscode';
import * as cucumber from './cucumber';
import log from './log';
import { ensureTestCaseInTree } from './test-tree';
import { TestContext } from './testContext';
import { getCucumberConfig } from './config/cucumber';

const resolveHandler = ({
  workspace,
  extensionConfig,
  controller,
}: TestContext) => {
  return async (
    item: vscode.TestItem | undefined,
    cancellationToken?: vscode.CancellationToken,
  ): Promise<void> => {
    if (!item) return;

    log.debug('Discovering tests', {
      workspace: workspace.name,
      extensionConfig,
    });

    const cucumberConfig = await getCucumberConfig(extensionConfig);

    const result = await cucumber.discoverTestCases(
      extensionConfig.baseUri.fsPath,
      cucumberConfig,
      log,
      cancellationToken,
    );

    if (!result.success) {
      log.warn(`Failed to discover tests`);
      item.error = result.error;
      return;
    }

    result.testCases.forEach(testCase => {
      ensureTestCaseInTree(controller, testCase);
    });
  };
};

export default resolveHandler;
