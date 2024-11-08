import { EOL } from 'os';
import * as vscode from 'vscode';
import * as cucumber from '../cucumber';
import { lines } from './util';

const testStepFinished =
  (run: vscode.TestRun) => (testStepFinished: cucumber.TestStepFinished) => {
    const result = testStepFinished.testStepResult();

    run.appendOutput(lines(' ' + result.$.status));

    if (result.status() !== 'FAILED') {
      return undefined;
    }

    const message = result.$.exception?.message ?? result.$.message;
    const stack = result.$.exception?.stackTrace?.split(EOL) ?? [];

    run.appendOutput(lines(...[message, ...stack].compact()));
  };

export default testStepFinished;
