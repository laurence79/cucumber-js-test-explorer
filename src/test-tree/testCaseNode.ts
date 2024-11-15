import * as vscode from 'vscode';
import * as cucumber from '@cucumber/messages';
import { TestCase } from '../cucumber';
import {
  guard,
  isTestItemWithDefiniteUri,
  TestItemWithDefiniteUri,
} from './utils';
import { ensureDocumentInTree } from './documentNode';
import { itemMetaData } from './itemMetaData';

const rangeOfScenario = ({
  location: { line, column = 1 },
  keyword,
  name,
}: cucumber.Scenario) => {
  return new vscode.Range(
    line - 1,
    column - 1,
    line - 1,
    column + keyword.length + name.length + 1,
  );
};

const ensureTestCaseInTree = (
  controller: vscode.TestController,
  testCase: TestCase,
): TestItemWithDefiniteUri => {
  const pickle = testCase.pickle();
  const document = pickle.document();
  const scenario = pickle.scenario();

  const documentTestItem = ensureDocumentInTree(controller, document);

  const itemId = `${documentTestItem.uri.toString()}/${scenario.$.name}`;

  let item = documentTestItem.children.get(itemId);

  if (!item) {
    item = controller.createTestItem(
      itemId,
      scenario.$.name,
      documentTestItem.uri,
    );

    item.range = rangeOfScenario(scenario.$);

    documentTestItem.children.add(item);

    itemMetaData.set(item, testCase);
  }

  guard(isTestItemWithDefiniteUri, item, 'Test case test item has no uri');

  return item;
};

export default ensureTestCaseInTree;
