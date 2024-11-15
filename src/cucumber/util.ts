export const getErrorMessage = (error: unknown) =>
  error &&
  typeof error === 'object' &&
  'message' in error &&
  typeof error.message === 'string'
    ? error.message
    : 'Unknown error';

export const walk = <T, U>(
  array: readonly T[],
  walkFn: (element: T) => U,
): U | undefined => {
  for (const element of array) {
    const result = walkFn(element);
    if (typeof result !== 'undefined') {
      return result;
    }
  }

  return undefined;
};
