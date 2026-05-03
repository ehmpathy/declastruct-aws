import { RefByPrimary, RefByUnique } from 'domain-objects';
import { given, then, when } from 'test-fns';

import type { DeclaredAwsOrganization } from './DeclaredAwsOrganization';
import type { DeclaredAwsOrganizationAccount } from './DeclaredAwsOrganizationAccount';
import type { DeclaredAwsOrganizationServiceControlPolicy } from './DeclaredAwsOrganizationServiceControlPolicy';
import { DeclaredAwsOrganizationServiceControlPolicyAttachment } from './DeclaredAwsOrganizationServiceControlPolicyAttachment';

describe('DeclaredAwsOrganizationServiceControlPolicyAttachment', () => {
  given('a valid policy reference and account target by id', () => {
    when('instantiated', () => {
      let attachment: DeclaredAwsOrganizationServiceControlPolicyAttachment;

      then('it should instantiate', () => {
        attachment = new DeclaredAwsOrganizationServiceControlPolicyAttachment({
          policy: RefByUnique.as<
            typeof DeclaredAwsOrganizationServiceControlPolicy
          >({ name: 'deny-snapshot-share' }),
          target: RefByPrimary.as<typeof DeclaredAwsOrganizationAccount>({
            id: '123456789012',
          }),
        });
      });

      then('it should have the policy reference', () => {
        expect(attachment.policy).toMatchObject({
          name: 'deny-snapshot-share',
        });
      });

      then('it should have the account target', () => {
        expect(attachment.target).toMatchObject({ id: '123456789012' });
      });
    });
  });

  given('a valid policy reference and account target by email', () => {
    when('instantiated', () => {
      let attachment: DeclaredAwsOrganizationServiceControlPolicyAttachment;

      then('it should instantiate', () => {
        attachment = new DeclaredAwsOrganizationServiceControlPolicyAttachment({
          policy: RefByUnique.as<
            typeof DeclaredAwsOrganizationServiceControlPolicy
          >({ name: 'deny-audit-tamper' }),
          target: RefByUnique.as<typeof DeclaredAwsOrganizationAccount>({
            email: 'prod@example.com',
          }),
        });
      });

      then('it should have the account target by email', () => {
        expect(attachment.target).toMatchObject({ email: 'prod@example.com' });
      });
    });
  });

  given('a valid policy reference and org target', () => {
    when('instantiated', () => {
      let attachment: DeclaredAwsOrganizationServiceControlPolicyAttachment;

      then('it should instantiate', () => {
        attachment = new DeclaredAwsOrganizationServiceControlPolicyAttachment({
          policy: RefByUnique.as<
            typeof DeclaredAwsOrganizationServiceControlPolicy
          >({ name: 'deny-org-escape' }),
          target: RefByPrimary.as<typeof DeclaredAwsOrganization>({
            id: 'o-abc123',
          }),
        });
      });

      then('it should have the org target', () => {
        expect(attachment.target).toMatchObject({ id: 'o-abc123' });
      });
    });
  });

  given('the static keys', () => {
    then('unique is defined as policy and target', () => {
      expect(
        DeclaredAwsOrganizationServiceControlPolicyAttachment.unique,
      ).toEqual(['policy', 'target']);
    });

    then('metadata is empty (no primary key for attachments)', () => {
      expect(
        DeclaredAwsOrganizationServiceControlPolicyAttachment.metadata,
      ).toEqual([]);
    });

    then('readonly is empty', () => {
      expect(
        DeclaredAwsOrganizationServiceControlPolicyAttachment.readonly,
      ).toEqual([]);
    });
  });
});
