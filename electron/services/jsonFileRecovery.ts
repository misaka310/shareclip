import { readFile, rename } from 'node:fs/promises';

export type JsonReadResult<T> =
  | { status: 'missing' }
  | { status: 'ok'; value: T }
  | { status: 'quarantined'; quarantinePath: string };

/**
 * Reads a JSON file owned by the app. A missing file is reported as `missing`.
 * A file that is not valid JSON, or that fails `isValid`, is renamed to
 * `<file>.corrupt-<timestamp>` and reported as `quarantined`, so the app can
 * start from defaults and the user can recover from the UI instead of being
 * stuck on an error that every IPC handler would hit again.
 */
export async function readJsonOrQuarantine<T>(
  filePath: string,
  isValid: (value: unknown) => value is T,
  now: () => Date = () => new Date()
): Promise<JsonReadResult<T>> {
  let content: string;
  try {
    content = await readFile(filePath, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { status: 'missing' };
    }
    throw error;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    parsed = undefined;
  }

  if (parsed !== undefined && isValid(parsed)) {
    return { status: 'ok', value: parsed };
  }

  const quarantinePath = `${filePath}.corrupt-${now().toISOString().replaceAll(':', '-')}`;
  await rename(filePath, quarantinePath);
  console.warn(`ShareClip moved an unreadable file aside: ${filePath} -> ${quarantinePath}`);
  return { status: 'quarantined', quarantinePath };
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Runs async tasks one at a time, in the order they were queued. */
export class SerialQueue {
  private tail: Promise<unknown> = Promise.resolve();

  run<T>(task: () => Promise<T>): Promise<T> {
    const result = this.tail.then(() => task());
    this.tail = result.catch(() => undefined);
    return result;
  }
}
