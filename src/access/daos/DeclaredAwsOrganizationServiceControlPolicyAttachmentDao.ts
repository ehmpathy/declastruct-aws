import { genDeclastructDao } from 'declastruct';
import type { ContextLogTrail } from 'simple-log-methods';

import type { ContextAwsApi } from '@src/domain.objects/ContextAwsApi';
import { DeclaredAwsOrganizationServiceControlPolicyAttachment } from '@src/domain.objects/DeclaredAwsOrganizationServiceControlPolicyAttachment';
import { delOrganizationServiceControlPolicyAttachment } from '@src/domain.operations/organizationServiceControlPolicyAttachment/delOrganizationServiceControlPolicyAttachment';
import { getOneOrganizationServiceControlPolicyAttachment } from '@src/domain.operations/organizationServiceControlPolicyAttachment/getOneOrganizationServiceControlPolicyAttachment';
import { setOrganizationServiceControlPolicyAttachment } from '@src/domain.operations/organizationServiceControlPolicyAttachment/setOrganizationServiceControlPolicyAttachment';

/**
 * .what = declastruct DAO for AWS Organization SCP Attachment resources
 * .why = wraps SCP attachment operations to conform to declastruct interface
 * .note
 *   - identified by composite key (policy + target), no primary key
 *   - findsert = attach if not attached, return extant (idempotent)
 *   - upsert not supported (attachments are binary: attached or not)
 *   - delete = detach policy from target
 *   - requires org manager auth for all operations
 */
export const DeclaredAwsOrganizationServiceControlPolicyAttachmentDao =
  genDeclastructDao<
    typeof DeclaredAwsOrganizationServiceControlPolicyAttachment,
    ContextAwsApi & ContextLogTrail
  >({
    dobj: DeclaredAwsOrganizationServiceControlPolicyAttachment,
    get: {
      one: {
        byPrimary: null, // composite key, no primary
        byUnique: async (input, context) => {
          return getOneOrganizationServiceControlPolicyAttachment(
            { by: { unique: input } },
            context,
          );
        },
      },
    },
    set: {
      findsert: async (input, context) => {
        return setOrganizationServiceControlPolicyAttachment(
          { findsert: input },
          context,
        );
      },
      upsert: null, // attachments cannot be updated
      delete: async (input, context) => {
        // input is Ref<typeof Attachment> which is RefByUnique since no primary
        const unique = input as {
          policy: { name: string };
          target:
            | { id: string }
            | { email: string }
            | { managementAccount: { id: string } };
        };
        await delOrganizationServiceControlPolicyAttachment(
          { by: { unique } },
          context,
        );
      },
    },
  });
