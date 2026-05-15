import { createInterface } from 'node:readline/promises';

let rl: ReturnType<typeof createInterface> | null = null;

const getReader = (): ReturnType<typeof createInterface> => {
  if (!rl) {
    rl = createInterface({ input: process.stdin, output: process.stdout });
  }
  return rl;
};

export const closeReader = (): void => {
  rl?.close();
  rl = null;
};

export const confirm = async (question: string): Promise<boolean> => {
  const reader = getReader();
  const answer = await reader.question(`${question} (y/N) `);
  return answer.trim().toLowerCase() === 'y';
};

export const log = {
  info: (msg: string): void => {
    process.stdout.write(`  ${msg}\n`);
  },
  error: (msg: string): void => {
    process.stderr.write(`✖ ${msg}\n`);
  },
  success: (msg: string): void => {
    process.stdout.write(`✔ ${msg}\n`);
  },
  note: (title: string, body: string): void => {
    process.stdout.write(`\n${title}\n${body}\n`);
  },
};
