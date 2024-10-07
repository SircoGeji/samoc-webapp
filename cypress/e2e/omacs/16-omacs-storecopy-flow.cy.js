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
  return result;
};
context('Store copy flow', () => {
  const android_PO = new Android_PO();
  const apiWaitTimeout = 60000;
  const apiWaitTimeoutObj = { timeout: apiWaitTimeout };
  const typeDelay = { delay: 0 };
  const ENV_SERVER_URL = Cypress.env('ENV_SERVER_URL');
  let savedStoreCopyId;
  // let duplicatedStoreCopyId;
  let randomString = generateRandomString(3)
  before(() => {
    cy.setLocalStorageClear();
    cy.customPostUserData();
    cy.saveLocalStorage();
    cy.fixture('StoreCopy-Android').then((data) => {
      globalThis.data = data;
    });
  });
  beforeEach(() => {
    cy.setViewPort();
  });
  it('Set headers and click create store copy', () => {
    android_PO.navigateToSamocSkuPage(apiWaitTimeout);
    android_PO.interceptAlias('GET', '**api/android/store-copy**', 'storecopy');
    android_PO.setHeaders('ANDROID', 'GOOGLE', 'twlght ', 'STORE COPY');
    android_PO.waitForAlias('@storecopy', apiWaitTimeoutObj);
    android_PO.interceptAlias(
      'GET',
      '**api/android/store-copy/fields**',
      'storecopyform',
    );
    cy.wait(apiWaitTimeout)
    cy.contains('.button-primary', 'CREATE NEW').click();
    android_PO.waitForAlias('@storecopyform', apiWaitTimeoutObj);
  });
  it('Validate saving store copy', () => {
    android_PO.clearThenFillEmptyForm('storeCopyName', data.name + randomString, typeDelay);
    cy.get('.region-button').eq(0).click();
    cy.contains('.show-plan-selector-container', 'googleBooleanField')
      .parent()
      .find('[type="checkbox"]')
      .check({ force: true });
    android_PO.clearThenFillEmptyContain(
      ' shortDescription ',
      data.languages['en-US'].tableData.shortDescription,
    );
    android_PO.clearThenFillEmptyContain(
      ' longDescription ',
      data.languages['en-US'].tableData.longDescription,
    );
    cy.contains('.copy-button', 'COPY').click();
    cy.get('.region-button').each(($el, index) => {
      if (index != 0) {
        cy.wrap($el)
          .click()
          .then(() => {
            cy.contains('.paste-button', 'PASTE').click();
          });
      }
    });
    android_PO.interceptAlias(
      'POST',
      '**/api/android/store-copy/save**',
      'StoreCopyPayload',
    );
    cy.contains('SAVE').click();
    cy.contains('[role="menuitem"]', 'SAVE ALL').click();
    android_PO.expectDialogMessage('Do you wish to proceed with  SAVE ALL?');
    cy.wait('@StoreCopyPayload').then(({ response }) => {
      savedStoreCopyId = response.body.data.storeCopyId;
    });
    android_PO.expectDialogMessage(
      `Android ${data.name}${randomString} StoreCopy module saved in DB successfully`,
    );
    android_PO.interceptAlias('GET', '**api/android/store-copy**', 'storecopy');
    cy.get('.backbtn').click();
    android_PO.waitForAlias('@storecopy', apiWaitTimeoutObj);
  });
  it('Validate filter and edit created store copy', () => {
    cy.get('[role="gridcell"]').should('exist');
    cy.contains('.button-primary', 'FILTERS').click();
    cy.contains('.mat-expansion-panel-header-title', 'TITLE')
      .should('be.visible')
      .click();
    android_PO.clearThenFillPlaceholderForm(
      'Enter Package Name',
      'Invalid name',
    );
    cy.contains('[role="gridcell"]', data.name + randomString).should('not.exist');
    android_PO.clearThenFillPlaceholderForm('Enter Package Name', data.name + randomString);
    android_PO.validateGridCellContains(data.name + randomString, 1, 'Ready');
    android_PO.clickDotMenuOption(data.name + randomString, 'Edit');
    cy.contains('Store Copy Name')
      .parent()
      .parent()
      .find('.mat-input-element')
      .should('have.value', data.name + randomString);
    cy.contains('.show-plan-selector-container', 'googleBooleanField')
      .parent()
      .find('[type="checkbox"]')
      .uncheck({ force: true });
    cy.contains('UPDATE').should('not.be.disabled').click();
    android_PO.interceptAlias('PUT', '**/update**', 'storecopyupdate');
    cy.contains('[role="menuitem"]', 'UPDATE ALL').click();
    android_PO.expectDialogMessage('Do you wish to proceed with  UPDATE ALL?');
    android_PO.waitForAlias('@storecopyupdate', apiWaitTimeoutObj);
    android_PO.expectDialogMessage(
      `Android ${data.name}${randomString} StoreCopy module updated in DB successfully`,
    );
    android_PO.interceptAlias('GET', '**api/android/store-copy**', 'storecopy');
    cy.get('.backbtn').click();
    android_PO.waitForAlias('@storecopy', apiWaitTimeoutObj);
  });
  it('Duplicate store copy', () => {
    cy.get('[role="gridcell"]').should('exist');
    cy.contains('.button-primary', 'FILTERS').click();
    cy.contains('.mat-expansion-panel-header-title', 'TITLE')
      .should('be.visible')
      .click();
    android_PO.clearThenFillPlaceholderForm('Enter Package Name', data.name + randomString);
    android_PO.interceptAlias('GET', '**api/android/store-copy**', 'storecopy');
    android_PO.clickDotMenuOption(data.name + randomString, 'Duplicate');
    android_PO.waitForAlias('@storecopy', apiWaitTimeoutObj);
    android_PO.clearThenFillEmptyContain('Store Copy Name', data.name + randomString);
    cy.contains('.store-name', 'GOOGLE').click();
    android_PO.validateErrorHaveText(
      0,
      ' This Store Copy Name already exists ',
    );
    android_PO.clearThenFillEmptyContain(
      'Store Copy Name',
      `${data.name}${randomString}  duplicated`,
    );
    cy.contains('.store-name', 'GOOGLE').click();
    android_PO.interceptAlias(
      'POST',
      '**/api/android/store-copy/save**',
      'StoreCopyPayload',
    );
    cy.contains('SAVE').click();
    cy.contains('[role="menuitem"]', 'SAVE ALL').click();
    android_PO.expectDialogMessage('Do you wish to proceed with  SAVE ALL?');
    cy.wait('@StoreCopyPayload').then(({ response }) => {
      // duplicatedStoreCopyId = response.body.data.appCopyId;
    });
    android_PO.expectDialogMessage(
      `Android ${data.name}${randomString}  duplicated StoreCopy module saved in DB successfully`,
    );
    android_PO.interceptAlias('GET', '**api/android/store-copy**', 'storecopy');
    cy.get('.backbtn').click();
    android_PO.waitForAlias('@storecopy', apiWaitTimeoutObj);
  });
  it('Delete store copies', () => {
    cy.get('[role="gridcell"]').should('exist');
    cy.contains('.button-primary', 'FILTERS').click();
    cy.contains('.mat-expansion-panel-header-title', 'TITLE')
      .should('be.visible')
      .click();
    android_PO.clearThenFillPlaceholderForm('Enter Package Name', data.name + randomString);
    cy.contains('[role="gridcell"]', data.name + randomString, 'duplicated').should(
      'be.visible',
    );
    android_PO.clickDotMenuOption( data.name + randomString,  'Delete');
    android_PO.expectDialogMessage(
      'Do you wish to proceed with DELETE', data.name +randomString, 'duplicated?',
    );
    android_PO.interceptAlias('GET', '**api/android/store-copy**', 'storecopy');
    android_PO.expectDialogMessage(
      'Android', data.name +randomString, 'duplicated StoreCopy module deleted from DB successfully',
    );
    android_PO.waitForAlias('@storecopy', apiWaitTimeoutObj);
    android_PO.deleteUsingAPI(ENV_SERVER_URL, 'store-copy', savedStoreCopyId);
  });
});
