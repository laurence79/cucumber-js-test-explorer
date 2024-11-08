import * as vscode from 'vscode';
import * as cucumber from '@cucumber/messages';
import { Document } from '../cucumber';
import { getRootItem } from './root';
import {
  guard,
  isTestItemWithDefiniteUri,
  TestItemWithDefiniteUri,
} from './utils';
import { itemMetaData } from './itemMetaData';
import ensurePathItemsInTree from './pathNode';

const rangeOfFeature = ({
  location: { line, column = 1 },
  keyword,
  name,
}: cucumber.Feature) => {
  return new vscode.Range(
    line - 1,
    column - 1,
    line - 1,
    column + keyword.length + name.length + 1,
  );
};

const isDefined = <T>(value: T): value is NonNullable<T> =>
  typeof value !== 'undefined';

export const uriForDocument = (
  document: Document,
  controller: vscode.TestController,
) => {
  guard(isDefined, document.$.uri, 'Document uri is required');

  const baseItem = getRootItem(controller);
  return vscode.Uri.joinPath(baseItem.uri, document.$.uri);
};

export const ensureDocumentInTree = (
  controller: vscode.TestController,
  document: Document,
): TestItemWithDefiniteUri => {
  guard(isDefined, document.$.uri, 'Document uri is required');

  const segments = document.$.uri.split('/');

  const documentFilename = segments.at(-1);
  if (!documentFilename) {
    throw new Error('Can not add a document without a filename');
  }

  const pathItems = segments.slice(0, -1);

  const documentParent = ensurePathItemsInTree(controller, pathItems);

  const uri = uriForDocument(document, controller);

  let item = documentParent.children.get(uri.toString());

  if (!item) {
    item = controller.createTestItem(
      uri.toString(),
      documentFilename,
      uriForDocument(document, controller),
    );

    if (document.$.feature) {
      item.description = document.$.feature.name;
      item.range = rangeOfFeature(document.$.feature);
    }

    documentParent.children.add(item);

    itemMetaData.set(item, document);
  }

  guard(isTestItemWithDefiniteUri, item, 'Document test item has no uri');

  return item;
};

const findItemWithId = (
  container: vscode.TestItem,
  id: string,
): vscode.TestItem | undefined => {
  const maybe = container.children.get(id);

  if (maybe) return maybe;

  const children: vscode.TestItem[] = [];
  container.children.forEach(child => {
    children.push(child);
  });

  for (const child of children) {
    const m = findItemWithId(child, id);
    if (m) return m;
  }

  return undefined;
};

export const removeDocumentFromTree = (
  controller: vscode.TestController,
  documentUri: vscode.Uri,
) => {
  const rootItem = getRootItem(controller);

  let item: vscode.TestItem | undefined = findItemWithId(
    rootItem,
    documentUri.toString(),
  );

  while (item) {
    item.parent?.children.delete(item.id);
    if ((item.parent?.children.size ?? 0) > 0) break;
    item = item.parent;
  }
};
