import { castIntoDeclaredAwsSnsTopic } from './castIntoDeclaredAwsSnsTopic';

/**
 * .what = unit coverage for the raw sns topic → DeclaredAwsSnsTopic cast
 * .why = pure boundary transform; pins arn/name pass-through + the null-vs-populated tags shape
 */
describe('castIntoDeclaredAwsSnsTopic', () => {
  test('populated tags → DeclaredAwsTags', () => {
    const topic = castIntoDeclaredAwsSnsTopic({
      arn: 'arn:aws:sns:us-east-1:111122223333:notify',
      name: 'notify',
      tags: { managedBy: 'declastruct', purpose: 'mail' },
    });
    expect(topic.arn).toEqual('arn:aws:sns:us-east-1:111122223333:notify');
    expect(topic.name).toEqual('notify');
    expect(topic.tags).toEqual({ managedBy: 'declastruct', purpose: 'mail' });
  });

  test('null tags → null', () => {
    const topic = castIntoDeclaredAwsSnsTopic({
      arn: 'arn:aws:sns:us-east-1:111122223333:notify',
      name: 'notify',
      tags: null,
    });
    expect(topic.tags).toEqual(null);
  });
});
