/**
 * .what = sample lambda handler for acceptance testing
 * .why = provides minimal code for lambda deployment tests
 */
exports.handler = async (event) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Hello from declastruct acceptance test!' }),
  };
};
