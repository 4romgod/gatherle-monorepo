import readline from 'node:readline';

export async function promptForHiddenValue(label: string): Promise<string> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error(`Unable to prompt for secret input without an interactive terminal: ${label}`);
  }

  return new Promise((resolve, reject) => {
    let value = '';
    const input = process.stdin;
    const output = process.stdout;
    const wasRawModeEnabled = input.isRaw;

    const cleanup = () => {
      input.off('keypress', onKeypress);
      if (typeof input.setRawMode === 'function') {
        input.setRawMode(Boolean(wasRawModeEnabled));
      }
      input.pause();
    };

    const finish = (result?: string, error?: Error) => {
      cleanup();
      output.write('\n');
      if (error) {
        reject(error);
        return;
      }
      resolve(result ?? '');
    };

    const onKeypress = (char: string, key: readline.Key) => {
      if (key.ctrl && key.name === 'c') {
        finish(undefined, new Error('Seed password prompt cancelled.'));
        return;
      }

      if (key.name === 'return' || key.name === 'enter') {
        finish(value);
        return;
      }

      if (key.name === 'backspace') {
        if (value.length > 0) {
          value = value.slice(0, -1);
          output.write('\b \b');
        }
        return;
      }

      if (!char || key.ctrl || key.meta) {
        return;
      }

      value += char;
      output.write('*');
    };

    readline.emitKeypressEvents(input);
    if (typeof input.setRawMode === 'function') {
      input.setRawMode(true);
    }
    input.resume();
    input.on('keypress', onKeypress);
    output.write(label);
  });
}
