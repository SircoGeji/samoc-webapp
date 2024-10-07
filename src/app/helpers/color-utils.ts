import { StatusEnum } from '../types/enum';

export const MODIFIED_COLOR = '#0C507F';
export const OTHER_COLOR = '#2D5847';
export const DRAFT_COLOR = '#565656';
export const FAILED_COLOR = '#bb0a13';
export const VALIDATED_COLOR = '#592965';
export const PENDING_COLOR = '#C1A700';
export const PUBLISHED_COLOR = '#2D5847';
export const RETIRED_COLOR = '#1C2622';

export const getStatusColor = (status: StatusEnum): string => {
  let result;

  if (status === StatusEnum.DFT) {
    result = DRAFT_COLOR;
  } else if (
    status === StatusEnum.STG_VALDN_FAIL ||
    status === StatusEnum.PROD_VALDN_FAIL ||
    status === StatusEnum.APV_REJ ||
    (status >= StatusEnum.STG_ERR_CRT && status <= StatusEnum.STG_ERR_DEL) ||
    (status >= StatusEnum.PROD_ERR_PUB && status <= StatusEnum.PROD_ERR_DEL) ||
    status === StatusEnum.STG_FAIL ||
    status === StatusEnum.PROD_FAIL ||
    status === StatusEnum.STG_RB_FAIL ||
    status === StatusEnum.PROD_RB_FAIL
  ) {
    result = FAILED_COLOR;
  } else if (
    status === StatusEnum.STG_VALDN_PASS ||
    status === StatusEnum.PROD_VALDN_PASS ||
    status === StatusEnum.APV_APRVD
  ) {
    result = VALIDATED_COLOR;
  } else if (
    status === StatusEnum.APV_PEND ||
    status === StatusEnum.PROD_PEND ||
    status === StatusEnum.STG_VALDN_PEND ||
    status === StatusEnum.PROD_VALDN_PEND
  ) {
    result = PENDING_COLOR;
  } else if (status === StatusEnum.PROD || status === StatusEnum.STG) {
    result = PUBLISHED_COLOR;
  } else if (
    status === StatusEnum.STG_RETD ||
    status === StatusEnum.PROD_RETD
  ) {
    result = RETIRED_COLOR;
  } else if (
    status === StatusEnum.STG_MODIFIED ||
    status === StatusEnum.PROD_MODIFIED
  ) {
    result = MODIFIED_COLOR;
  } else {
    result = OTHER_COLOR;
  }

  // apply luminance
  if (status <= StatusEnum.STG_FAIL) {
    return LightenDarkenColor(result, 33);
  }

  return result;
};

/* tslint:disable:no-bitwise */
export const LightenDarkenColor = (col: string, amt: number): string => {
  let usePound = false;

  if (col[0] === '#') {
    col = col.slice(1);
    usePound = true;
  }

  const num = parseInt(col, 16);

  let r = (num >> 16) + amt;

  if (r > 255) {
    r = 255;
  } else if (r < 0) {
    r = 0;
  }

  let b = ((num >> 8) & 0x00ff) + amt;

  if (b > 255) {
    b = 255;
  } else if (b < 0) {
    b = 0;
  }

  let g = (num & 0x0000ff) + amt;

  if (g > 255) {
    g = 255;
  } else if (g < 0) {
    g = 0;
  }

  return (usePound ? '#' : '') + (g | (b << 8) | (r << 16)).toString(16);
};
/* tslint:enable:no-bitwise */

export const isOffline = (): boolean => {
  // check network connectivity
  const el: HTMLElement = document.querySelector(
    '.header-component-container-taskbar-container-health',
  );
  if (!navigator.onLine) {
    if (el) {
      el.style.backgroundColor = 'red';
    }
    return true;
  } else {
    if (el) {
      el.style.backgroundColor = 'green';
    }
    return false;
  }
};
