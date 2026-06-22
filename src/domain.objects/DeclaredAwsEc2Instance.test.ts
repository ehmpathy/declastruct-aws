import { given, then, when } from 'test-fns';

import { DeclaredAwsEc2Instance } from './DeclaredAwsEc2Instance';

describe('DeclaredAwsEc2Instance', () => {
  given('required properties', () => {
    when('instantiated', () => {
      let instance: DeclaredAwsEc2Instance;

      then('it should instantiate', () => {
        instance = new DeclaredAwsEc2Instance({
          exid: 'test-bastion',
          template: null,
          subnet: { exid: 'my-subnet' },
          securityGroups: [{ exid: 'my-sg' }],
          tags: null,
        });
      });

      then('it should have the required properties', () => {
        expect(instance).toMatchObject({
          exid: 'test-bastion',
          template: null,
          subnet: { exid: 'my-subnet' },
          securityGroups: [{ exid: 'my-sg' }],
          tags: null,
        });
      });

      then('metadata and readonly are undefined by default', () => {
        expect(instance.id).toBeUndefined();
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
          template: { exid: 'my-template' },
          subnet: { id: 'subnet-abc123' },
          securityGroups: [{ id: 'sg-xyz789' }],
          tags: { managedBy: 'declastruct', purpose: 'test' },
          privateIp: '10.0.1.100',
        });
      });

      then('it should have all properties', () => {
        expect(instance).toMatchObject({
          id: 'i-1234567890abcdef0',
          exid: 'test-bastion',
          template: { exid: 'my-template' },
          subnet: { id: 'subnet-abc123' },
          securityGroups: [{ id: 'sg-xyz789' }],
          tags: { managedBy: 'declastruct', purpose: 'test' },
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

    then('readonly is defined as privateIp', () => {
      expect(DeclaredAwsEc2Instance.readonly).toEqual(['privateIp']);
    });
  });
});
