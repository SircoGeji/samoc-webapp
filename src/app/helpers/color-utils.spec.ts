import { StatusEnum } from '../types/enum';
import * as colorUtils from './color-utils';

describe('color utils helpers', () => {
  it('should return color base on status', () => {
    const re = colorUtils.getStatusColor(StatusEnum.DFT);
    expect(re).toBe(colorUtils.LightenDarkenColor(colorUtils.DRAFT_COLOR, 33));

    const re2 = colorUtils.getStatusColor(StatusEnum.PROD_FAIL);
    expect(re2).toBe(colorUtils.FAILED_COLOR);

    const re3 = colorUtils.getStatusColor(StatusEnum.PROD_VALDN_PASS);
    expect(re3).toBe(colorUtils.VALIDATED_COLOR);

    const re4 = colorUtils.getStatusColor(StatusEnum.PROD_VALDN_PEND);
    expect(re4).toBe(colorUtils.PENDING_COLOR);

    const re5 = colorUtils.getStatusColor(StatusEnum.PROD_VALDN_PEND);
    expect(re5).toBe(colorUtils.PENDING_COLOR);

    const re6 = colorUtils.getStatusColor(StatusEnum.PROD);
    expect(re6).toBe(colorUtils.PUBLISHED_COLOR);

    const re7 = colorUtils.getStatusColor(StatusEnum.PROD_RETD);
    expect(re7).toBe(colorUtils.RETIRED_COLOR);

    const re8 = colorUtils.getStatusColor(StatusEnum.PROD_MODIFIED);
    expect(re8).toBe(colorUtils.MODIFIED_COLOR);
  });

  it('should check navigator offline and change header-component-container-taskbar-container-health style', () => {
    const dummyElement = document.createElement('div');
    document.querySelector = jasmine
      .createSpy('HTML Element')
      .and.returnValue(dummyElement);
    const testElem = document.querySelector(
      '.header-component-container-taskbar-container-health',
    );
    testElem.setAttribute('style', 'color: black');
    expect(testElem.getAttribute('style')).toEqual('color: black');
    colorUtils.isOffline();
    expect([
      'color: black; background-color: red;',
      'color: black; background-color: green;',
    ]).toContain(testElem.getAttribute('style'));
  });
});
