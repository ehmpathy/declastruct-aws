/**
 * .what = the id of the single whole-bucket lifecycle rule declastruct owns
 * .why = the get (read-recognition) and the put (write-stamp) must agree on which rule is ours, so
 *   a foreign rule (added via the console or another IaC tool) is never misread as ours by the get,
 *   nor silently destroyed by the put's replace-all (rule.forbid.silent-resource-theft). it lives in
 *   its own module so BOTH sides import the ONE literal — a hardcoded copy on either side could
 *   desync write-stamp from read-recognition on a future rename
 */
export const DECLASTRUCT_LIFECYCLE_RULE_ID = 'declastruct-lifecycle';
