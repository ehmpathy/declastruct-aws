/**
 * .what = builds a timestamped log entry for tunnel operations
 * .why = extracts log message construction from orchestrator
 */
export const asTunnelLogEntry = (input: {
  message: string;
  timestamp?: Date;
}): string => {
  const ts = (input.timestamp ?? new Date()).toISOString();
  return `[${ts}] ${input.message}\n`;
};
