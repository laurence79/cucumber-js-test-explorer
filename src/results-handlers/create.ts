import * as vscode from 'vscode';
import * as cucumber from '../cucumber';
import debuggerListening from './debuggerListening';
import testCaseFinished from './testCaseFinished';
import testCaseStarted from './testCaseStarted';
import testStepFinished from './testStepFinished';
import testStepStarted from './testStepStarted';

const create = (
  workspace: vscode.WorkspaceFolder,
  testController: vscode.TestController,
  testRun: vscode.TestRun,
): cucumber.RunTestsCallbackHandlers => ({
  debuggerListening: debuggerListening(workspace),
  testCaseFinished: testCaseFinished(testRun, testController),
  testCaseStarted: testCaseStarted(testRun, testController),
  testStepFinished: testStepFinished(testRun),
  testStepStarted: testStepStarted(testRun),
});

export {
  debuggerListening,
  testCaseFinished,
  testCaseStarted,
  testStepFinished,
  testStepStarted,
};

export default create;
