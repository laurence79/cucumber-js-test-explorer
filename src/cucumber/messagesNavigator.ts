import * as raw from '@cucumber/messages';
import type {
  Document,
  Feature,
  FeatureChild,
  Pickle,
  PickleStep,
  Scenario,
  Step,
  TestCase,
  TestCaseFinished,
  TestCaseStarted,
  TestStep,
  TestStepFinished,
  TestStepResult,
  TestStepStarted,
} from './types';
import { walk } from './util';

const orThrow = (message: string): never => {
  throw new Error(message);
};

class MessagesNavigator {
  constructor(public readonly messages: readonly raw.Envelope[]) {}

  private allOfType = <K extends keyof raw.Envelope, U>(
    type: K,
    ctor: (message: NonNullable<raw.Envelope[K]>) => U,
  ): U[] => {
    return this.messages.compactMap(m => (m[type] ? ctor(m[type]) : undefined));
  };

  private findById = <K extends keyof raw.Envelope, U>(
    type: K,
    ctor: (message: NonNullable<raw.Envelope[K]>) => U,
  ) => {
    return (id: string): U =>
      ctor(
        this.messages.find(
          m => m[type] && 'id' in m[type] && m[type].id === id,
        )?.[type] ?? orThrow(`${type} with id "${id}" not found.`),
      );
  };

  private findBy = <K extends keyof raw.Envelope, U, V>(
    type: K,
    extractor: (obj: NonNullable<raw.Envelope[K]>) => V,
    ctor: (message: NonNullable<raw.Envelope[K]>) => U,
  ) => {
    return (value: V): U =>
      ctor(
        this.messages.find(m => m[type] && extractor(m[type]) === value)?.[
          type
        ] ?? orThrow(`${type} with value "${String(value)}" not found.`),
      );
  };

  private queryBy = <K extends keyof raw.Envelope, U, V>(
    type: K,
    extractor: (obj: NonNullable<raw.Envelope[K]>) => V,
    ctor: (message: NonNullable<raw.Envelope[K]>) => U,
  ) => {
    return (value: V): U | undefined => {
      const obj = this.messages.find(
        m => m[type] && extractor(m[type]) === value,
      )?.[type];
      return obj ? ctor(obj) : undefined;
    };
  };

  allDocuments() {
    return this.allOfType('gherkinDocument', this.document.bind(this));
  }
  allTestCases() {
    return this.allOfType('testCase', this.testCase.bind(this));
  }

  findDocumentByUri = this.findBy(
    'gherkinDocument',
    m => m.uri,
    this.document.bind(this),
  );
  findHook = this.findById('hook', this.hook.bind(this));
  findPickle = this.findById('pickle', this.pickle.bind(this));
  findStepDefinition = this.findById(
    'stepDefinition',
    this.stepDefinition.bind(this),
  );
  findTestCase = this.findById('testCase', this.testCase.bind(this));
  findTestCaseFinished = this.findBy(
    'testCaseFinished',
    m => m.testCaseStartedId,
    this.testCaseFinished.bind(this),
  );
  findTestCaseStarted = this.findById(
    'testCaseStarted',
    this.testCaseStarted.bind(this),
  );

  document($: raw.GherkinDocument): Document {
    const document: Document = {
      $,
      feature: () =>
        $.feature ? this.feature(document, $.feature) : undefined,
      pickles: () => ($.uri ? this.documentPickles($.uri) : []),
    };

    return document;
  }
  documentPickles(documentUri: string) {
    return this.messages.compactMap(m =>
      m.pickle?.uri === documentUri ? this.pickle(m.pickle) : undefined,
    );
  }
  feature(document: Document, $: raw.Feature): Feature {
    const feature: Feature = {
      $,
      document,
      children: () =>
        $.children.map(child => this.featureChild(feature, child)),
    };

    return feature;
  }
  featureChild(feature: Feature, $: raw.FeatureChild): FeatureChild {
    const featureChild: FeatureChild = {
      $,
      feature,
      scenario: () =>
        $.scenario ? this.scenario(featureChild, $.scenario) : undefined,
    };

    return featureChild;
  }
  scenario(featureChild: FeatureChild, $: raw.Scenario): Scenario {
    const scenario: Scenario = {
      $: $,
      featureChild,
      steps: () => $.steps.map(step => this.step(scenario, step)),
    };

    return scenario;
  }
  step(scenario: Scenario, $: raw.Step): Step {
    const step: Step = {
      $,
      scenario,
    };

    return step;
  }
  hook($: raw.Hook) {
    return $;
  }
  pickle($: raw.Pickle): Pickle {
    const document = () => this.findDocumentByUri($.uri);

    const pickle = {
      $,
      document,
      scenario: () =>
        walk(this.allDocuments(), doc =>
          walk(doc.feature()?.children() ?? [], featureChild => {
            const scenario = featureChild.scenario();
            if (scenario && $.astNodeIds.includes(scenario.$.id)) {
              return scenario;
            }
          }),
        ) ?? orThrow('Invalid scenario'),
    };

    return pickle;
  }
  pickleStep(pickle: Pickle, stepId: string): PickleStep {
    const $ =
      pickle.$.steps.find(s => s.id === stepId) ??
      orThrow('Invalid pickle step');

    return {
      $,
      pickle,
      step: () =>
        walk(this.allDocuments(), doc =>
          walk(doc.feature()?.children() ?? [], featureChild =>
            walk(featureChild.scenario()?.steps() ?? [], step => {
              if ($.astNodeIds.includes(step.$.id)) {
                return step;
              }
            }),
          ),
        ) ?? orThrow('Invalid step'),
    };
  }
  stepDefinition($: raw.StepDefinition) {
    return $;
  }
  testCase($: raw.TestCase): TestCase {
    const pickle = () => this.findPickle($.pickleId);

    const steps = () => $.testSteps.map(s => this.testStep(testCase, s.id));

    const worstStepResult = () =>
      this.testStepResult(
        raw.getWorstTestStepResult(
          steps().compactMap(step => step.testStepFinished()?.$.testStepResult),
        ),
      );

    const totalDuration = () =>
      steps()
        .compactMap(step => step.testStepFinished()?.$.testStepResult.duration)
        .map(raw.TimeConversion.durationToMilliseconds)
        .sum();

    const testCase: TestCase = {
      $,
      pickle,
      steps,
      worstStepResult,
      totalDuration,
    };

    return testCase;
  }
  testCaseFinished($: raw.TestCaseFinished): TestCaseFinished {
    return {
      $,
      testCaseStarted: () => this.findTestCaseStarted($.testCaseStartedId),
    };
  }
  testCaseStarted($: raw.TestCaseStarted): TestCaseStarted {
    return {
      $,
      testCase: () => this.findTestCase($.testCaseId),
    };
  }
  testStep(testCase: TestCase, stepId: string): TestStep {
    const $ =
      testCase.$.testSteps.find(s => s.id === stepId) ??
      orThrow('Invalid test step');

    return {
      $,
      hook: () => ($.hookId ? this.findHook($.hookId) : undefined),
      pickleStep: () =>
        $.pickleStepId
          ? this.pickleStep(testCase.pickle(), $.pickleStepId)
          : undefined,
      testStepFinished: () =>
        this.queryBy(
          'testStepFinished',
          o => o.testStepId,
          this.testStepFinished.bind(this),
        )(stepId),
    };
  }
  testStepStarted($: raw.TestStepStarted): TestStepStarted {
    const testCaseStarted = () => this.findTestCaseStarted($.testCaseStartedId);

    return {
      $,
      testCaseStarted,
      testStep: () => this.testStep(testCaseStarted().testCase(), $.testStepId),
    };
  }

  testStepFinished($: raw.TestStepFinished): TestStepFinished {
    return {
      $,
      testStepResult: () => this.testStepResult($.testStepResult),
    };
  }

  testStepResult($: raw.TestStepResult): TestStepResult {
    return {
      $,
      status: () => $.status,
    };
  }
}

export default MessagesNavigator;
