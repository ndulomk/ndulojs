import { createInterface } from 'node:readline/promises';

export const confirm = async (question: string): Promise<boolean> => {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`${question} (y/N) `);
  rl.close();
  return answer.trim().toLowerCase() === 'y';
};

export const log = {
  info: (msg: string): boolean => process.stdout.write(`  ${msg}\n`),
  error: (msg: string): boolean => process.stderr.write(`✖ ${msg}\n`),
  success: (msg: string): boolean => process.stdout.write(`✔ ${msg}\n`),
  note: (title: string, body: string): boolean => process.stdout.write(`\n${title}\n${body}\n`),
};
