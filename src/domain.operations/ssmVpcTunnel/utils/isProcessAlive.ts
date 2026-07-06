/**
 * .what = checks if a process with given pid is still running
 * .why = enables detection of crashed tunnel processes
 */
export const isProcessAlive = (input: { pid: number }): boolean => {
  try {
    // signal 0 = check existence only, does not send actual signal
    process.kill(input.pid, 0);
    return true;
  } catch {
    return false;
  }
};
