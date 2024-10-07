import { environment as env } from '../../environments/environment';

export const randomStr = (len, arr?: string): string => {
  if (!arr) {
    arr = 'abcdefghijklmnopqrstuvwxyz0123456789';
  }
  let ans = '';
  for (let i = len; i > 0; i--) {
    ans += arr[Math.floor(Math.random() * arr.length)];
  }
  return ans;
};

export const removeXid = (msg: string) => {
  return msg.replace(/\s*\(xId: .*\)/, '');
};

export const getApiEndpoint = (path: string): string => {
  const port = env.port ? `:${env.port}` : ``;
  return `${window.location.protocol}//${env.host}${port}${path}`;
};

export const formatStringWithTokens = (
  string: string,
  ...tokens: any[]
): string => {
  const args = tokens;
  return string.replace(/{(\d+)}/g, function () {
    // eslint-disable-next-line prefer-rest-params
    return args[arguments[1]];
  });
};

export const getFileSizeInBytes = (fileSize: string): number | undefined => {
  const attachment = fileSize.charAt(fileSize.length - 2);
  const sizeStr = fileSize.substring(0, fileSize.indexOf(attachment));
  switch (attachment) {
    case 'K':
      return Number(sizeStr) * 1024;
    case 'M':
      return Number(sizeStr) * 1024 * 1024;
    case 'G':
      return Number(sizeStr) * 1024 * 1024 * 1024;
  }
}
