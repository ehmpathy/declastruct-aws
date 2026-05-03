import { given, then, when } from 'test-fns';

import { DeclaredAwsOrganizationPolicyEligibility } from './DeclaredAwsOrganizationPolicyEligibility';

describe('DeclaredAwsOrganizationPolicyEligibility', () => {
  given('a valid policy type', () => {
    when('instantiated with SERVICE_CONTROL_POLICY', () => {
      let policyType: DeclaredAwsOrganizationPolicyEligibility;

      then('it should instantiate', () => {
        policyType = new DeclaredAwsOrganizationPolicyEligibility({
          type: 'SERVICE_CONTROL_POLICY',
          choice: 'ENABLED',
        });
      });

      then('it should have the type', () => {
        expect(policyType.type).toBe('SERVICE_CONTROL_POLICY');
      });

      then('it should have the choice', () => {
        expect(policyType.choice).toBe('ENABLED');
      });
    });

    when('instantiated with TAG_POLICY', () => {
      let policyType: DeclaredAwsOrganizationPolicyEligibility;

      then('it should instantiate', () => {
        policyType = new DeclaredAwsOrganizationPolicyEligibility({
          type: 'TAG_POLICY',
          choice: 'DISABLED',
        });
      });

      then('it should have the type', () => {
        expect(policyType.type).toBe('TAG_POLICY');
      });

      then('it should have the choice', () => {
        expect(policyType.choice).toBe('DISABLED');
      });
    });
  });

  given('the static keys', () => {
    then('unique is defined as type', () => {
      expect(DeclaredAwsOrganizationPolicyEligibility.unique).toEqual(['type']);
    });

    then('metadata is empty', () => {
      expect(DeclaredAwsOrganizationPolicyEligibility.metadata).toEqual([]);
    });

    then('readonly is empty', () => {
      expect(DeclaredAwsOrganizationPolicyEligibility.readonly).toEqual([]);
    });
  });
});
