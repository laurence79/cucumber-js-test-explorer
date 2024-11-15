import * as vscode from 'vscode';
import { ConfigInstance } from '../config/instance';
import { isTestItemWithDefiniteUri } from './utils';

const ROOT_ITEM_ID = 'root';

export const getRootItem = (controller: vscode.TestController) => {
  const item = controller.items.get(ROOT_ITEM_ID);

  if (!item || !isTestItemWithDefiniteUri(item)) {
    throw new Error('Base item missing, or without uri');
  }

  return item;
};

export const recycleRootItem = (
  controller: vscode.TestController,
  extensionConfig: ConfigInstance,
) => {
  controller.items.delete(ROOT_ITEM_ID);

  const label =
    extensionConfig.baseUri.path.split('/').last() ?? extensionConfig.name;

  const item = controller.createTestItem(
    ROOT_ITEM_ID,
    label,
    extensionConfig.baseUri,
  );

  item.canResolveChildren = true;

  controller.items.add(item);
};
