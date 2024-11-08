import * as vscode from 'vscode';
import { ExtensionConfig } from '../config/extension';
import { isTestItemWithDefiniteUri } from './utils';

const ROOT_ITEM_ID = 'root';

export const getRootItem = (controller: vscode.TestController) => {
  const baseItem = controller.items.get(ROOT_ITEM_ID);

  if (!baseItem || !isTestItemWithDefiniteUri(baseItem)) {
    throw new Error('Base item missing, or without uri');
  }

  return baseItem;
};

export const recycleRootItem = (
  controller: vscode.TestController,
  workspace: vscode.WorkspaceFolder,
  extensionConfig: ExtensionConfig,
) => {
  controller.items.delete(ROOT_ITEM_ID);

  const item = controller.createTestItem(
    ROOT_ITEM_ID,
    extensionConfig.cwd ?? workspace.name,
    extensionConfig.baseUri,
  );

  item.canResolveChildren = true;

  controller.items.add(item);
};
