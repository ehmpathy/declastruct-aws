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
          network: {
            subnet: { exid: 'my-subnet' },
            security: { groups: [{ exid: 'my-sg' }] },
            interface: { publicIpEnabled: false, sourceDestChecked: true },
          },
          tags: null,
        });
      });

      then('it should have the required properties', () => {
        expect(instance).toMatchObject({
          exid: 'test-bastion',
          template: null,
          network: {
            subnet: { exid: 'my-subnet' },
            security: { groups: [{ exid: 'my-sg' }] },
            interface: { publicIpEnabled: false, sourceDestChecked: true },
          },
          tags: null,
        });
      });

      then('metadata and readonly are undefined by default', () => {
        expect(instance.id).toBeUndefined();
        expect(instance.network.interface.privateIp).toBeUndefined();
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
          network: {
            subnet: { id: 'subnet-abc123' },
            security: { groups: [{ id: 'sg-xyz789' }] },
            interface: {
              publicIpEnabled: false,
              sourceDestChecked: true,
              privateIp: '10.0.1.100',
            },
          },
          tags: { managedBy: 'declastruct', purpose: 'test' },
        });
      });

      then('it should have all properties', () => {
        expect(instance).toMatchObject({
          id: 'i-1234567890abcdef0',
          exid: 'test-bastion',
          template: { exid: 'my-template' },
          network: {
            subnet: { id: 'subnet-abc123' },
            security: { groups: [{ id: 'sg-xyz789' }] },
            interface: {
              publicIpEnabled: false,
              sourceDestChecked: true,
              privateIp: '10.0.1.100',
            },
          },
          tags: { managedBy: 'declastruct', purpose: 'test' },
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

    then('readonly is defined as the nested nic ip addresses', () => {
      expect(DeclaredAwsEc2Instance.readonly).toEqual([
        'network.interface.privateIp',
        'network.interface.publicIp',
      ]);
    });
  });
});
