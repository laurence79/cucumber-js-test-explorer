import * as vscode from 'vscode';
import * as cucumber from '../cucumber';
import { ensureTestCaseInTree } from '../test-tree';
import { lines } from './util';

const testCaseStarted =
  (run: vscode.TestRun, controller: vscode.TestController) =>
  (testCaseStarted: cucumber.TestCaseStarted) => {
    const testCase = testCaseStarted.testCase();
    const testItem = ensureTestCaseInTree(controller, testCase);
    const { name, uri } = testCase.pickle().$;

    run.appendOutput(lines(`  ${uri}`, `    ${name}`));
    run.started(testItem);
  };

export default testCaseStarted;
