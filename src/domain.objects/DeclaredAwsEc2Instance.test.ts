import { given, then, when } from 'test-fns';

import { DeclaredAwsEc2Instance } from './DeclaredAwsEc2Instance';

describe('DeclaredAwsEc2Instance', () => {
  given('a valid exid', () => {
    when('instantiated', () => {
      let instance: DeclaredAwsEc2Instance;

      then('it should instantiate', () => {
        instance = new DeclaredAwsEc2Instance({ exid: 'test-bastion' });
      });

      then('it should have the exid', () => {
        expect(instance).toMatchObject({ exid: 'test-bastion' });
      });

      then('metadata and readonly are undefined by default', () => {
        expect(instance.id).toBeUndefined();
        expect(instance.status).toBeUndefined();
        expect(instance.privateIp).toBeUndefined();
      });
    });
  });

  given('all properties provided', () => {
    when('instantiated with metadata and readonly', () => {
      let instance: DeclaredAwsEc2Instance;

      then('it should instantiate', () => {
        instance = new DeclaredAwsEc2Instance({
          id: 'i-1234567890abcdef0',
          exid: 'test-bastion',
          status: 'running',
          privateIp: '10.0.1.100',
        });
      });

      then('it should have all properties', () => {
        expect(instance).toMatchObject({
          id: 'i-1234567890abcdef0',
          exid: 'test-bastion',
          status: 'running',
          privateIp: '10.0.1.100',
        });
      });
    });
  });

  given('the static keys', () => {
    then('unique is defined as exid', () => {
      expect(DeclaredAwsEc2Instance.unique).toEqual(['exid']);
    });

    then('primary is defined as id', () => {
      expect(DeclaredAwsEc2Instance.primary).toEqual(['id']);
    });

    then('metadata is defined as id', () => {
      expect(DeclaredAwsEc2Instance.metadata).toEqual(['id']);
    });

    then('readonly is defined as status, privateIp', () => {
      expect(DeclaredAwsEc2Instance.readonly).toEqual(['status', 'privateIp']);
    });
  });
});
