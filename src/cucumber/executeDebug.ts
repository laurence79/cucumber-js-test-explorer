import execute, { ExecuteOptions } from './execute';

const LISTENING_PREFIX = 'Debugger listening on ws://';

interface ExecuteDebugOptions extends ExecuteOptions {
  onDebuggerListening: (url: string) => void;
}

const executeDebug = ({
  onDebuggerListening,
  onErrorLine,
  nodeOptions,
  ...rest
}: ExecuteDebugOptions) => {
  return execute({
    ...rest,
    nodeOptions: [nodeOptions, '--inspect=0'].compact().join(' '),
    onErrorLine: line => {
      onErrorLine(line);

      if (line.startsWith(LISTENING_PREFIX)) {
        const url = line.substring(LISTENING_PREFIX.length);
        if (url) onDebuggerListening(url);
      }
    },
  });
};

export default executeDebug;
