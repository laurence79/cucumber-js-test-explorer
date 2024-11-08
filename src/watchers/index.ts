import * as vscode from 'vscode';
import { ExtensionConfig } from '../config/extension';
import cucumberConfigWatcher from './cucumberConfig';
import featureFileWatcher from './featureFiles';

export default (
  controller: vscode.TestController,
  extensionConfig: ExtensionConfig,
) => [
  cucumberConfigWatcher(controller, extensionConfig),
  featureFileWatcher(controller, extensionConfig),
];
