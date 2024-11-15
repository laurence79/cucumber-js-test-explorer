import 'ts-array-extensions';
import * as vscode from 'vscode';
import testController from './testController';
import createConfigPipeline, { ConfigPipeline } from './config/pipeline';
import log from './log';

let pipeline: ConfigPipeline | undefined;
let instancesDisposables: vscode.Disposable[] | undefined;
let instancesSubscription: Disposable | undefined;

export function activate() {
  log.debug('Activating extension');

  pipeline = createConfigPipeline();

  instancesSubscription = pipeline.instances.subscribe(
    instances => {
      instancesDisposables?.forEach(disposable => {
        disposable.dispose();
      });
      instancesDisposables = instances.flatMap(instance =>
        testController(instance),
      );
    },
    { sendCurrentValue: true },
  );

  log.info('Extension activated');
}

export function deactivate() {
  log.debug('Deactivating extension');

  pipeline?.dispose();
  instancesDisposables?.forEach(disposable => {
    disposable.dispose();
  });
  instancesSubscription?.[Symbol.dispose]();

  log.info('Extension deactivated');
}
