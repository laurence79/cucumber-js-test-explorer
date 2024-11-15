import { EOL } from 'os';
import * as vscode from 'vscode';
import * as cucumber from '../cucumber';
import { uriForDocument, ensureTestCaseInTree } from '../test-tree';
import { lines } from './util';

const STACK_LINE_REGEX =
  /^\s*at (?<method>.+)\s\((?<file>.*):(?<line>\d+):(?<character>\d+)\)$/;

const stackFramesFromStackTrace = (
  stackTrace: string,
): vscode.TestMessageStackFrame[] => {
  return stackTrace.split(EOL).map(frame => {
    const groups = STACK_LINE_REGEX.exec(frame)?.groups;

    const uri = groups?.file ? vscode.Uri.parse(groups.file) : undefined;

    const position =
      groups?.line && groups.character
        ? new vscode.Position(+groups.line - 1, +groups.character - 1)
        : undefined;

    return new vscode.TestMessageStackFrame(frame, uri, position);
  });
};

const rangeOfStep = ({
  $: {
    location: { line, column = 1 },
    keyword,
    text,
  },
}: cucumber.Step) => {
  return new vscode.Range(
    line - 1,
    column - 1,
    line - 1,
    column + keyword.length + text.length + 1,
  );
};

const testMessagesForTestCase = (
  testCase: cucumber.TestCase,
  controller: vscode.TestController,
): vscode.TestMessage[] => {
  return testCase.steps().compactMap(testCaseStep => {
    const result = testCaseStep.testStepFinished()?.testStepResult();
    if (result?.status() !== 'FAILED') {
      return undefined;
    }

    const message = new vscode.TestMessage(
      result.$.exception?.message ?? result.$.message ?? result.status(),
    );

    const step = testCaseStep.pickleStep()?.step();

    if (step) {
      message.location = new vscode.Location(
        uriForDocument(testCase.pickle().document(), controller),
        rangeOfStep(step),
      );
    }

    if (result.$.exception?.stackTrace) {
      message.stackTrace = stackFramesFromStackTrace(
        result.$.exception.stackTrace,
      );
    }

    return message;
  });
};

const testCaseFinished =
  (run: vscode.TestRun, controller: vscode.TestController) =>
  (testCaseFinished: cucumber.TestCaseFinished) => {
    const testCase = testCaseFinished.testCaseStarted().testCase();

    const testItem = ensureTestCaseInTree(controller, testCase);

    const caseResult = testCase.worstStepResult().status();
    const duration = testCase.totalDuration();

    switch (caseResult) {
      case 'PASSED':
        run.passed(testItem, duration);
        run.appendOutput(lines('', '    ✔️ PASSED'));
        break;

      case 'FAILED': {
        run.failed(
          testItem,
          testMessagesForTestCase(testCase, controller),
          duration,
        );
        run.appendOutput(lines('', '    X FAILED'));
        break;
      }
      default:
        run.skipped(testItem);
    }
  };

export default testCaseFinished;
