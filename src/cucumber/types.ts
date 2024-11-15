import * as raw from '@cucumber/messages';

export interface CancellationToken {
  isCancellationRequested: boolean;
  onCancellationRequested: (listener: () => void) => void;
}

export interface ExecutionLogger {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trace(message: string, ...args: any[]): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  debug(message: string, ...args: any[]): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  info(message: string, ...args: any[]): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  warn(message: string, ...args: any[]): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error(error: string | Error, ...args: any[]): void;
}

export interface Document {
  $: raw.GherkinDocument;
  feature: () => Feature | undefined;
  pickles: () => readonly Pickle[];
}

export interface Feature {
  $: raw.Feature;
  document: Document;
  children: () => readonly FeatureChild[];
}

export interface FeatureChild {
  $: raw.FeatureChild;
  feature: Feature;
  scenario: () => Scenario | undefined;
}

export interface Scenario {
  $: raw.Scenario;
  featureChild: FeatureChild;
  steps: () => readonly Step[];
}

export interface Step {
  $: raw.Step;
  scenario: Scenario;
}

export interface Pickle {
  $: raw.Pickle;
  document: () => Document;
  scenario: () => Scenario;
}

export interface PickleStep {
  $: raw.PickleStep;
  pickle: Pickle;
  step: () => Step;
}

export interface TestCase {
  $: raw.TestCase;
  pickle: () => Pickle;
  steps: () => readonly TestStep[];
  worstStepResult: () => TestStepResult;
  totalDuration: () => number;
}

export interface TestCaseFinished {
  $: raw.TestCaseFinished;
  testCaseStarted: () => TestCaseStarted;
}

export interface TestCaseStarted {
  $: raw.TestCaseStarted;
  testCase: () => TestCase;
}

export interface TestStep {
  $: raw.TestStep;
  hook: () => raw.Hook | undefined;
  pickleStep: () => PickleStep | undefined;
  testStepFinished: () => TestStepFinished | undefined;
}

export interface TestStepStarted {
  $: raw.TestStepStarted;
  testCaseStarted: () => TestCaseStarted;
  testStep: () => TestStep;
}

export interface TestStepFinished {
  $: raw.TestStepFinished;
  testStepResult: () => TestStepResult;
}

export type TestStepResultStatus = `${raw.TestStepResultStatus}`;

export interface TestStepResult {
  $: raw.TestStepResult;
  status: () => TestStepResultStatus;
}
