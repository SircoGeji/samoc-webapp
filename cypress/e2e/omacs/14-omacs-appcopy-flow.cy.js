/// <reference types="cypress-xpath" />

import 'cypress-localstorage-commands';
import 'cypress-real-events';
import Android_PO from '../../support/pageObject/android/android_PO';

const generateRandomString = (length) => {
  const characters = 'abcdefghijklmnopqrstuvwxyz';
  let result = '';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;1
};
 let randomString = generateRandomString(3)

context('App copy flow', () => {
  const android_PO = new Android_PO();
  const apiWaitTimeout = 15000;
  const apiWaitTimeoutObj = { timeout: apiWaitTimeout };
  const typeDelay = { delay: 0, force: true };
  const ENV_SERVER_URL = Cypress.env('ENV_SERVER_URL');
  let savedAppCopyId;
  // let duplicatedAppCopyId;
  const selectPlatform = (platform) => {
    cy.get('.app-copy-switch-tab-buttons-container').contains(platform).click();
  };
  before(() => {
    cy.setLocalStorageClear();
    cy.customPostUserData();
    cy.saveLocalStorage();
    cy.fixture('AppCopy-Android').then((data) => {
      globalThis.data = data;
    });
  });
  beforeEach(() => {
    cy.setViewPort();
  });
  it('Set headers and click create app copy', () => {
    android_PO.navigateToSamocSkuPage(apiWaitTimeout);
    android_PO.interceptAlias('GET', '**api/android/app-copy**', 'appcopy');
    android_PO.setHeaders('ANDROID', 'GOOGLE', 'twlght ', 'APP COPY');
    android_PO.waitForAlias('@appcopy', apiWaitTimeoutObj);
    android_PO.interceptAlias(
      'GET',
      '**api/android/app-copy/fields**',
      'appcopyform',
    );
    cy.contains('.button-primary', 'CREATE NEW').click();
    android_PO.waitForAlias('@appcopyform', apiWaitTimeoutObj);
  });
  it('Validate saving app copy into payload', () => {
    cy.get('.app-copy-form-input').should('exist').and('not.be.disabled');
    cy.contains('App Copy Name*')
      .parent()
      .parent()
      .find('.mat-input-element')
      .clear()
      .type(data.name + randomString);
    cy.contains('.region-button', 'US').click();
    selectPlatform('MOBILE COPY');
    const arraytv = Object.values(data.platforms.tv.US.languages['en-US']);
    const arraymobile = Object.values(
      data.platforms.mobile.US.languages['en-US'],
    );
    cy.contains('.show-plan-selector-container', 'Show plan selector')
      .parent()
      .find('[type="checkbox"]')
      .check({ force: true });
    cy.contains('.cell-container', 'en-US')
      .parent()
      .find('.app-copy-form-input')
      .filter('[type="text"]')
      .each(($el, index) => {
        android_PO.clearThenFillEmptyTableForm(
          $el,
          0,
          arraymobile[index],
          typeDelay,
        );
      });
    selectPlatform('10ft COPY');
    cy.contains('.show-plan-selector-container', 'Show plan selector')
      .parent()
      .find('[type="checkbox"]')
      .check({ force: true });
    cy.contains('.cell-container', 'en-US')
      .parent()
      .parent()
      .find('.app-copy-form-input')
      .filter('[type="text"]')
      .each(($el, index) => {
        android_PO.clearThenFillEmptyTableForm(
          $el,
          0,
          arraytv[index],
          typeDelay,
        );
      });
    android_PO.interceptAlias(
      'POST',
      '**/api/android/app-copy/save**',
      'AppCopyPayload',
    );
    cy.wait(3000)
    cy.contains('SAVE').click();
    cy.contains('[role="menuitem"]', 'SAVE ALL').click();
    android_PO.expectDialogMessage('Do you wish to proceed with  SAVE ALL?');
    cy.wait('@AppCopyPayload').then(({ request, response }) => {
      // expect(JSON.stringify(request.body)).to.eq(JSON.stringify(data));
      savedAppCopyId = response.body.data.appCopyId;
    });
    android_PO.expectDialogMessage(
      `Android ${data.name}${randomString} AppCopy module saved in DB successfully`,
    );
    android_PO.interceptAlias('GET', '**api/android/app-copy**', 'appcopy');
    cy.get('.backbtn').click();
    android_PO.waitForAlias('@appcopy', apiWaitTimeoutObj);
  });
  it('Validate filter and edit created app copy', () => {
    cy.get('[role="gridcell"]').should('exist');
    cy.contains('.button-primary', 'FILTERS').click();
    cy.contains('.mat-expansion-panel-header-title', 'COPY PACKAGE NAME')
      .should('be.visible')
      .click();
    android_PO.clearThenFillPlaceholderForm(
      'Enter Package Name',
      'Invalid name',
    );
    cy.contains('[role="gridcell"]', data.name + randomString).should('not.exist');
    android_PO.clearThenFillPlaceholderForm('Enter Package Name', data.name + randomString);
    android_PO.clickDotMenuOption(data.name + randomString, 'Edit');
    cy.get('.app-copy-form-input').should('exist').and('not.be.disabled');
    cy.contains('App Copy Name*')
      .parent()
      .parent()
      .find('.mat-input-element')
      .should('have.value', data.name + randomString);
    selectPlatform('10ft COPY');
    cy.contains('.show-plan-selector-container', 'Show plan selector')
      .parent()
      .find('[type="checkbox"]')
      .uncheck({ force: true });
    selectPlatform('MOBILE COPY');
    cy.contains('.show-plan-selector-container', 'Show plan selector')
      .parent()
      .find('[type="checkbox"]')
      .uncheck({ force: true });
    cy.contains('UPDATE').should('not.be.disabled').click();
    android_PO.interceptAlias('PUT', '**/update**', 'appcopyupdate');
    cy.contains('[role="menuitem"]', 'UPDATE ALL').click();
    android_PO.expectDialogMessage('Do you wish to proceed with  UPDATE ALL?');
    android_PO.waitForAlias('@appcopyupdate', apiWaitTimeoutObj);
    android_PO.expectDialogMessage(
      `Android ${data.name}${randomString} AppCopy module updated in DB successfully`,
    );
    android_PO.interceptAlias('GET', '**api/android/app-copy**', 'appcopy');
    cy.get('.backbtn').click();
    android_PO.waitForAlias('@appcopy', apiWaitTimeoutObj);
  });
  it('Duplicate app copy', () => {
    cy.get('[role="gridcell"]').should('exist');
    cy.contains('.button-primary', 'FILTERS').click();
    cy.contains('.mat-expansion-panel-header-title', 'COPY PACKAGE NAME')
      .should('be.visible')
      .click();
    android_PO.clearThenFillPlaceholderForm('Enter Package Name', data.name);
    android_PO.interceptAlias('GET', '**api/android/app-copy**', 'appcopy');
    android_PO.clickDotMenuOption(data.name, 'Duplicate');
    android_PO.waitForAlias('@appcopy', apiWaitTimeoutObj);
    cy.get('.app-copy-form-input').should('exist').and('not.be.disabled');
    cy.contains('App Copy Name*')
      .parent()
      .parent()
      .find('.mat-input-element')
      .clear()
      .type(data.name + randomString);
    selectPlatform('10ft COPY');
    android_PO.validateErrorHaveText(0, ' This App Copy Name already exists ');
    cy.contains('App Copy Name*')
      .parent()
      .parent()
      .find('.mat-input-element')
      .clear()
      .type(data.name + 'duplicated');
    android_PO.interceptAlias(
      'POST',
      '**/api/android/app-copy/save**',
      'AppCopyPayload',
    );
    selectPlatform('MOBILE COPY');
    cy.contains('SAVE').click();
    cy.contains('[role="menuitem"]', 'SAVE ALL').click();
    android_PO.expectDialogMessage('Do you wish to proceed with  SAVE ALL?');
    cy.wait('@AppCopyPayload').then(({ response }) => {
      // duplicatedAppCopyId = response.body.data.appCopyId;
    });
    android_PO.expectDialogMessage(
      `Android ${data.name}duplicated AppCopy module saved in DB successfully`,
    );
    android_PO.interceptAlias('GET', '**api/android/app-copy**', 'appcopy');
    cy.get('.backbtn').click();
    android_PO.waitForAlias('@appcopy', apiWaitTimeoutObj);
  });
  it('Delete app copies', () => {
    cy.get('[role="gridcell"]').should('exist');
    cy.contains('.button-primary', 'FILTERS').click();
    cy.contains('.mat-expansion-panel-header-title', 'COPY PACKAGE NAME')
      .should('be.visible')
      .click();
    android_PO.clearThenFillPlaceholderForm('Enter Package Name', data.name);
    cy.contains('[role="gridcell"]', data.name + 'duplicated').should(
      'be.visible',
    );
    android_PO.clickDotMenuOption(data.name + 'duplicated', 'Delete');
    android_PO.expectDialogMessage(
      `Do you wish to proceed with DELETE "${data.name}duplicated"?`,
    );
    android_PO.interceptAlias('GET', '**api/android/app-copy**', 'appcopy');
    android_PO.expectDialogMessage(
      `Android ${data.name}duplicated AppCopy module deleted from DB successfully`,
    );
    android_PO.waitForAlias('@appcopy', apiWaitTimeoutObj);
    android_PO.deleteUsingAPI(ENV_SERVER_URL, 'app-copy', savedAppCopyId);
  });
});
