import { spawn } from 'child_process';
import { EOL } from 'os';
import * as messages from '@cucumber/messages';
import { IRunConfiguration, IRunOptions } from '@cucumber/cucumber/api';
import treeKill from 'tree-kill';
import { CancellationToken, ExecutionLogger } from './types';

export interface ExecuteOptions {
  cancellationToken?: CancellationToken;
  config: IRunConfiguration;
  cwd: string;
  log: ExecutionLogger;
  nodeOptions?: string;
  onErrorLine: (text: string) => void;
  onMessage: (message: messages.Envelope) => void;
  onOutputLine: (text: string) => void;
}

const lineBuffer = (onLine: (line: string) => void) => {
  let pipeline = '';

  const next = (buffer: Buffer) => {
    pipeline += buffer.toString('utf-8');
    while (pipeline.includes(EOL)) {
      if (pipeline.length === 1) {
        pipeline = '';
        return;
      }
      const line = pipeline.substring(0, pipeline.indexOf(EOL));
      pipeline = pipeline.substring(pipeline.indexOf(EOL) + 1);
      onLine(line);
    }
  };

  const flush = () => {
    if (pipeline.length > 0) {
      onLine(pipeline);
    }
    pipeline = '';
  };

  return {
    next,
    flush,
  };
};

const js = (options: IRunOptions) => `
  require('@cucumber/cucumber/api').runCucumber(
    ${JSON.stringify(options)}
  );
`;

const execute = async ({
  cancellationToken,
  config,
  cwd,
  log,
  nodeOptions,
  onErrorLine,
  onMessage,
  onOutputLine,
}: ExecuteOptions) => {
  return new Promise<boolean>((resolve, reject) => {
    let completed = false;

    const env = {
      ...process.env,
      NODE_OPTIONS: [
        process.env.NODE_OPTIONS,
        // see https://github.com/TypeStrong/ts-node/issues/2053
        '--enable-source-maps',
        nodeOptions,
      ]
        .compact()
        .join(' '),
    };

    const args = [
      '-e',
      js({
        ...config,
        formats: {
          files: {},
          publish: false,
          options: {},
          stdout: 'message',
        },
      }),
    ];

    log.debug('Executing cucumber', { args, cwd });

    const p = spawn('node', args, {
      cwd,
      env,
    });

    cancellationToken?.onCancellationRequested(() => {
      completed = true;
      if (p.pid) treeKill(p.pid);
      reject(new Error('Cancelled'));
    });

    const stdout = lineBuffer(line => {
      log.debug(line);
      try {
        onMessage(messages.parseEnvelope(line));
      } catch {
        onOutputLine(line);
      }
    });

    p.stdout.on('data', d => {
      if (completed) return;
      stdout.next(d as Buffer);
    });

    const stderr = lineBuffer(line => {
      log.debug(line);
      onErrorLine(line);
    });

    p.stderr.on('data', d => {
      if (completed) return;
      stderr.next(d as Buffer);
    });

    p.on('error', error => {
      if (completed) return;
      reject(error);
    });

    p.on('close', code => {
      if (completed) return;
      stdout.flush();
      stderr.flush();
      resolve(code === 0);
    });
  });
};

export default execute;
