import * as stringUtils from './string-utils';
import { environment as env } from '../../environments/environment';
import { getApiEndpoint } from './string-utils';

describe('string utils', () => {
  it('should generate random string', () => {
    const re = stringUtils.randomStr(20);
    expect(re.length).toBe(20);
  });

  it('should genearte random string with special character with arr', () => {
    const re = stringUtils.randomStr(20, '!');
    expect(re).toContain('!');
    expect(re.length).toBe(20);
  });

  it('should remove xid', () => {
    const re = stringUtils.removeXid(
      "Some error message with some xid message\n(xId: 'd6340b26-bcc8-4f0e-804a-dc8bc367406e')",
    );
    expect(re).not.toMatch('xId');
  });

  it('should return api endpoint', () => {
    env.port = '';
    env.host = 'host1';
    const re1 = getApiEndpoint('/api/abc');
    expect(re1).toMatch(`${window.location.protocol}//host1/api/abc`);

    env.port = '1234';
    env.host = 'host2';
    const re2 = getApiEndpoint('/api/xyz');
    expect(re2).toMatch(`${window.location.protocol}//host2:1234/api/xyz`);
  });
});
