import * as vscode from 'vscode';

type WithRequiredProperty<T, K extends keyof T> = Omit<T, K> &
  Pick<{ [P in keyof T]-?: NonNullable<T[P]> }, K>;

export type TestItemWithDefiniteUri = WithRequiredProperty<
  vscode.TestItem,
  'uri'
>;

export const isTestItemWithDefiniteUri = (
  testItem: vscode.TestItem,
): testItem is TestItemWithDefiniteUri => {
  return !!testItem.uri;
};

export function guard<U extends T, T = unknown>(
  typeGuard: (value: T) => value is U,
  value: T,
  errorMessage: string,
): asserts value is U {
  if (!typeGuard(value)) {
    throw new Error(errorMessage);
  }
}
