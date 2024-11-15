import * as vscode from 'vscode';
import { getRootItem } from './root';
import {
  guard,
  isTestItemWithDefiniteUri,
  TestItemWithDefiniteUri,
} from './utils';

const ensurePathItemsInTree = (
  controller: vscode.TestController,
  pathItems: string[],
): TestItemWithDefiniteUri => {
  const baseItem = getRootItem(controller);

  let current = baseItem;

  while (pathItems.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const next = pathItems.shift()!;

    const uri = vscode.Uri.joinPath(current.uri, next);

    let child = current.children.get(uri.toString());

    if (!child) {
      child = controller.createTestItem(uri.toString(), next, uri);

      current.children.add(child);
    }

    guard(
      isTestItemWithDefiniteUri,
      child,
      'Unable to mount test item without uri into tree',
    );

    current = child;
  }

  return current;
};

export default ensurePathItemsInTree;
