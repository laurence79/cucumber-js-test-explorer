export const getErrorMessage = (error: unknown) =>
  error &&
  typeof error === 'object' &&
  'message' in error &&
  typeof error.message === 'string'
    ? error.message
    : 'Unknown error';

export const coerceError = (error: unknown): Error => {
  if (error instanceof Error) return error;

  return new Error(getErrorMessage(error));
};
