import * as vscode from 'vscode';
import { Document, TestCase } from '../cucumber';

export const itemMetaData = new WeakMap<vscode.TestItem, Document | TestCase>();

export const getMetaDataForTestItem = (testItem: vscode.TestItem) =>
  itemMetaData.get(testItem) ?? null;
