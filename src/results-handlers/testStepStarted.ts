import * as vscode from 'vscode';
import * as cucumber from '../cucumber';

const testStepStarted =
  (run: vscode.TestRun) => (testStepStarted: cucumber.TestStepStarted) => {
    const testStep = testStepStarted.testStep();

    const maybeHook = testStep.hook();
    const maybeStep = testStep.pickleStep();

    const stepDescription = maybeHook
      ? (maybeHook.name ??
        `Hook from ${maybeHook.sourceReference.uri ?? 'unknown source'}`)
      : maybeStep
        ? maybeStep.$.text
        : 'Unknown';

    run.appendOutput(`      >> ${stepDescription}`);
  };

export default testStepStarted;
