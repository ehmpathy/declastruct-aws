import { given, then, when } from 'test-fns';

import { asSsmStartSessionArgs } from './asSsmStartSessionArgs';

describe('asSsmStartSessionArgs', () => {
  given('bastion, cluster, localPort, and region', () => {
    when('region is provided', () => {
      const result = asSsmStartSessionArgs({
        bastion: { id: 'i-123456' },
        cluster: { host: { writer: 'db.example.com' }, port: 5432 },
        localPort: 15432,
        region: 'us-east-1',
      });

      then('it includes the region argument', () => {
        expect(result).toContain('--region');
        expect(result).toContain('us-east-1');
      });

      then('it includes all base arguments', () => {
        expect(result).toContain('ssm');
        expect(result).toContain('start-session');
        expect(result).toContain('--target');
        expect(result).toContain('i-123456');
        expect(result).toContain('--document-name');
        expect(result).toContain('--parameters');
      });

      then('parameters are JSON encoded', () => {
        const paramsIndex = result.indexOf('--parameters');
        const params = JSON.parse(result[paramsIndex + 1]!);
        expect(params.host).toEqual(['db.example.com']);
        expect(params.portNumber).toEqual(['5432']);
        expect(params.localPortNumber).toEqual(['15432']);
      });
    });

    when('region is null', () => {
      const result = asSsmStartSessionArgs({
        bastion: { id: 'i-789012' },
        cluster: { host: { writer: 'db2.example.com' }, port: 3306 },
        localPort: 13306,
        region: null,
      });

      then('it does not include the region argument', () => {
        expect(result).not.toContain('--region');
      });

      then('it includes all base arguments', () => {
        expect(result).toContain('--target');
        expect(result).toContain('i-789012');
      });
    });
  });
});
