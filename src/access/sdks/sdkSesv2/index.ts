import { createConfigurationSet } from './createConfigurationSet';
import { createConfigurationSetEventDestination } from './createConfigurationSetEventDestination';
import { createEmailIdentity } from './createEmailIdentity';
import { delConfigurationSet } from './delConfigurationSet';
import { delConfigurationSetEventDestination } from './delConfigurationSetEventDestination';
import { delEmailIdentity } from './delEmailIdentity';
import { delResourceTags } from './delResourceTags';
import { getAccount } from './getAccount';
import { getConfigurationSet } from './getConfigurationSet';
import { getConfigurationSetEventDestinations } from './getConfigurationSetEventDestinations';
import { getEmailIdentity } from './getEmailIdentity';
import { putAccountDetails } from './putAccountDetails';
import { putEmailIdentityDkim } from './putEmailIdentityDkim';
import { putEmailIdentityMailFrom } from './putEmailIdentityMailFrom';
import { setResourceTags } from './setResourceTags';
import { updateConfigurationSetEventDestination } from './updateConfigurationSetEventDestination';

/**
 * .what = dao-style SDK wrapper for AWS SES v2
 * .why = provides raw i/o communicator operations for SES email identities, configuration
 *   sets + their event destinations, plus the shared SES resource-tag ops
 */
export const sdkSesv2 = {
  getAccount,
  putAccountDetails,
  getEmailIdentity,
  createEmailIdentity,
  delEmailIdentity,
  putEmailIdentityDkim,
  putEmailIdentityMailFrom,
  getConfigurationSet,
  createConfigurationSet,
  delConfigurationSet,
  getConfigurationSetEventDestinations,
  createConfigurationSetEventDestination,
  updateConfigurationSetEventDestination,
  delConfigurationSetEventDestination,
  setResourceTags,
  delResourceTags,
};
