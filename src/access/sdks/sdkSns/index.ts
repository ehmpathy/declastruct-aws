import { delTopic } from './delTopic';
import { delTopicTags } from './delTopicTags';
import { getTopicAttributes } from './getTopicAttributes';
import { listTopicTags } from './listTopicTags';
import { setTopic } from './setTopic';
import { setTopicTags } from './setTopicTags';

/**
 * .what = dao-style SDK wrapper for AWS SNS
 * .why = provides raw i/o communicator operations for SNS
 */
export const sdkSns = {
  getTopicAttributes,
  setTopic,
  delTopic,
  listTopicTags,
  setTopicTags,
  delTopicTags,
};
