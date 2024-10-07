/// <reference types="cypress-xpath" />

import 'cypress-localstorage-commands';
import 'cypress-real-events';
import Android_PO from '../../support/pageObject/android/android_PO';

context('Regions and languages flow', () => {
  const android_PO = new Android_PO();
  const apiWaitTimeout = 15000;
  const apiWaitTimeoutObj = { timeout: apiWaitTimeout };
  // const typeDelay = { delay: 0 };
  // const ENV_SERVER_URL = Cypress.env('ENV_SERVER_URL');

  before(() => {
    cy.setLocalStorageClear();
    cy.customPostUserData();
    cy.saveLocalStorage();
  });
  beforeEach(() => {
    cy.setViewPort();
  });
  const generateRandomString = (length) => {
    const characters = 'abcdefghijklmnopqrstuvwxyz';
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  };
  let randomString = generateRandomString(3)

  it('Set headers and click create language', () => {
    android_PO.navigateToSamocSkuPage(apiWaitTimeout);
    android_PO.interceptAlias('GET', '**api/android/language**', 'language');
    android_PO.setHeaders('ANDROID', 'GOOGLE', 'twlght ', 'REGIONS');
    android_PO.waitForAlias('@language', apiWaitTimeoutObj);
    cy.contains('[role="tab"]', 'LANGUAGES').click();
    cy.wait(1000);
    cy.contains('.button-primary', 'CREATE NEW').click();
  });
  it('Validate initial form of a language', () => {
    cy.get('[type="text"]').each((el) => {
      cy.wrap(el).should('be.empty');
    });
    android_PO.validateErrorHaveText(0, ' Please enter Language Name ');
    android_PO.validateErrorHaveText(1, ' Please enter Code ');
  });
  it('Validate saving language', () => {
    cy.contains('Language Name*').parent().parent().parent().type('Cypress');
    cy.contains('Code*').parent().parent().parent().type('cc-CC');
    cy.contains('.title', 'NEW LANGUAGE').click();
    cy.contains('.button-secondary', 'SAVE').should('not.be.disabled').click();
    android_PO.interceptAlias('POST', 'api/android/language/save', 'language');
    android_PO.expectDialogMessage('Do you wish to proceed with SAVE?');
    android_PO.interceptAlias('GET', '**api/android/language**', 'languages');
    android_PO.expectDialogMessage(
      `Android Cypress language saved in DB successfully`,
    );
    android_PO.waitForAlias('@language', apiWaitTimeoutObj);
    android_PO.waitForAlias('@languages', apiWaitTimeoutObj);
  });
  it('Validate filter and edit created language', () => {
    cy.get('[role="gridcell"]').should('exist');
    cy.contains('.button-primary', 'FILTERS').click();
    cy.contains('.mat-expansion-panel-header-title', ' Language Name ')
      .should('be.visible')
      .click();
    android_PO.clearThenFillPlaceholderForm(
      'Enter Language Name',
      'Invalid name',
    );
    cy.contains('[role="gridcell"]', 'Cypress').should('not.exist');
    android_PO.clearThenFillPlaceholderForm('Enter Language Name', 'Cypress');
    cy.contains('[role="gridcell"]', 'Cypress').should('be.visible');
    cy.contains('[role="gridcell"]', 'Cypress')
      .parent()
      .find('.mat-menu-trigger')
      .click();
    cy.contains('.mat-menu-item', 'Edit').click();
    cy.wait(1000);
    cy.contains('Code*').parent().parent().parent().clear().type('cc-XX');
    cy.contains('.title', 'EDIT LANGUAGE').click();
    cy.contains('UPDATE').should('not.be.disabled').click();
    cy.contains('.button-dialog-primary', 'OK').click(); // dialog message is not validated
    android_PO.interceptAlias('GET', '**api/android/language**', 'language');
    android_PO.expectDialogMessage(
      'Android Cypress language updated successfully',
    );
    android_PO.waitForAlias('@language', apiWaitTimeoutObj);
  });
  it('Create regions using created language', () => {
    cy.contains('[role="tab"]', 'REGIONS').click();
    cy.wait(1000);
    cy.contains('.button-primary', 'CREATE NEW').click();
    android_PO.validateErrorHaveText(0, ' Please enter Region Name ');
    android_PO.validateErrorHaveText(1, ' Please enter Code ');
    android_PO.validateErrorHaveText(
      2,
      ' Please select at least one language ',
    );
    cy.contains('Region Name*').parent().parent().parent().type('Cypress');
    cy.contains('Code*').parent().parent().parent().type('CS');
    cy.contains('.checkbox-label', 'cc-XX')
      .parent()
      .find('[type="checkbox"]')
      .check();
    cy.get('[role="combobox"]').should('contain', 'cc-XX');
    cy.contains('.button-secondary', 'SAVE').should('not.be.disabled').click();
    android_PO.interceptAlias('POST', 'api/android/language/save', 'language');
    android_PO.expectDialogMessage('Do you wish to proceed with SAVE?');
    android_PO.interceptAlias('GET', '**api/android/country**', 'country');
    android_PO.expectDialogMessage(
      'Android Cypress country module saved as draft successfully',
    );
    android_PO.waitForAlias('@country', apiWaitTimeoutObj);
  });
  it('Validate filter and edit created region', () => {
    cy.get('[role="gridcell"]').should('exist');
    cy.contains('.button-primary', 'FILTERS').click();
    cy.contains('.mat-expansion-panel-header-title', ' Region Name ')
      .should('be.visible')
      .click();
    android_PO.clearThenFillPlaceholderForm(
      'Enter Region Name',
      'Invalid name',
    );
    cy.contains('[role="gridcell"]', 'Cypress').should('not.exist');
    android_PO.clearThenFillPlaceholderForm('Enter Region Name', 'Cypress');
    cy.contains('[role="gridcell"]', 'Cypress').should('be.visible');
    cy.contains('[role="gridcell"]', 'Cypress')
      .parent()
      .find('.mat-menu-trigger')
      .click();
    cy.contains('.mat-menu-item', 'Edit').click();
    cy.contains('Code*').parent().parent().parent().clear().type('QQ');
    cy.contains('.title', 'EDIT REGION').click();
    cy.contains('UPDATE').should('not.be.disabled').click();
    cy.contains('.button-dialog-primary', 'OK').click(); // dialog message is not validated
    android_PO.interceptAlias('GET', '**api/android/country**', 'country');
    android_PO.expectDialogMessage(
      'Android Cypress country module updated successfully',
    );
    android_PO.waitForAlias('@country', apiWaitTimeoutObj);
  });
  it('Delete region', () => {
    cy.contains('[role="tab"]', 'REGIONS').click();
    cy.wait(1000);
    cy.get('[role="gridcell"]').should('exist');
    cy.contains('.button-primary', 'FILTERS').click();
    cy.contains('.mat-expansion-panel-header-title', ' Region Name ')
      .should('be.visible')
      .click();
    android_PO.clearThenFillPlaceholderForm('Enter Region Name', 'Cypress');
    cy.contains('[role="gridcell"]', 'Cypress').should('be.visible');
    cy.contains('[role="gridcell"]', 'Cypress')
      .parent()
      .find('.mat-menu-trigger')
      .click();
    cy.contains('.mat-menu-item', 'Delete').click();
    android_PO.expectDialogMessage(
      `Do you wish to proceed with DELETE "Cypress"?`,
    );
    android_PO.interceptAlias('GET', '**api/android/country**', 'country');
    android_PO.expectDialogMessage(
      `Android Cypress country deleted successfully`,
    );
    android_PO.waitForAlias('@country', apiWaitTimeoutObj);
  });
  it('Delete language', () => {
    cy.contains('[role="tab"]', 'LANGUAGES').click();
    cy.wait(1000);
    cy.get('[role="gridcell"]').should('exist');
    cy.contains('.button-primary', 'FILTERS').click();
    cy.contains('.mat-expansion-panel-header-title', ' Language Name ')
      .should('be.visible')
      .click();
    android_PO.clearThenFillPlaceholderForm('Enter Language Name', 'Cypress');
    cy.contains('[role="gridcell"]', 'Cypress').should('be.visible');
    cy.contains('[role="gridcell"]', 'Cypress')
      .parent()
      .find('.mat-menu-trigger')
      .click();
    cy.contains('.mat-menu-item', 'Delete').click();
    android_PO.expectDialogMessage(
      `Do you wish to proceed with DELETE "Cypress"?`,
    );
    android_PO.interceptAlias('GET', '**api/android/language**', 'language');
    android_PO.expectDialogMessage(
      `Android Cypress language deleted successfully`,
    );
    android_PO.waitForAlias('@language', apiWaitTimeoutObj);
  });
});
