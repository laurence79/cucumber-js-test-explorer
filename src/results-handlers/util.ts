import { EOL } from 'os';

/* eslint-disable import-x/prefer-default-export */
export const lines = (...text: string[]) =>
  text.flatMap(line => line.split(EOL)).join('\r\n') + '\r\n';
