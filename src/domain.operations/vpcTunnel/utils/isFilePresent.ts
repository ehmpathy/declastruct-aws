import * as fs from 'fs/promises';

/**
 * .what = checks if a file exists at the given path
 * .why = enables explicit file existence checks without try/catch
 */
export const isFilePresent = async (input: {
  path: string;
}): Promise<boolean> => {
  try {
    await fs.access(input.path);
    return true;
  } catch (err) {
    // file not found is expected; return false
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return false;

    // failfast on unexpected errors
    throw err;
  }
};
