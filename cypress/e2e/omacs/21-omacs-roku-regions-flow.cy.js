/// <reference types="cypress-xpath" />

import 'cypress-localstorage-commands';
import 'cypress-real-events';
import Roku_PO from '../../support/pageObject/roku/roku_PO';

context('Regions and languages flow', () => {
  const roku_PO = new Roku_PO();
  const apiWaitTimeout = 15000;
  const apiWaitTimeoutObj = { timeout: apiWaitTimeout };
  
  before(() => {
    cy.setLocalStorageClear();
    cy.customPostUserData();
    cy.saveLocalStorage();
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

  it('Set headers,verify language grid page and create new language', () => {
    roku_PO.navigateToSamocSkuPage(apiWaitTimeout);
    roku_PO.interceptAlias('GET', '**api/roku/language**', 'language');
    roku_PO.setHeaders('ROKU',  'twlght ', 'REGIONS');
    roku_PO.waitForAlias('@language', apiWaitTimeoutObj);
    cy.contains('[role="tab"]', 'LANGUAGES').click();
    roku_PO.waitForLoad('div', 'regions-languages-table-container', 'table');
    cy.wait(1000);
    cy.contains('.button-primary', 'CREATE NEW').click();
  });
  it('Validate initial form of a language', () => { 
    cy.get('[type="text"]').each((el) => {
      cy.wrap(el).should('be.empty');
    });
    roku_PO.validateErrorHaveText(0, ' Please enter Language Name ');
    roku_PO.validateErrorHaveText(1, ' Please enter Code ');
  });
  it('Validate saving language', () => {
    cy.contains('Language Name*').parent().parent().parent().type('Chinese');
    cy.contains('Code*').parent().parent().parent().type('zh-CN');
    cy.contains('.title', 'NEW LANGUAGE').click();
    cy.contains('.button-secondary', 'SAVE').should('not.be.disabled').click();
    roku_PO.interceptAlias('POST', 'api/roku/language/save', 'language');
    roku_PO.expectDialogMessage('Do you wish to proceed with SAVE?');
    roku_PO.interceptAlias('GET', '**api/roku/language**', 'languages');
    roku_PO.expectDialogMessage(
      `Roku Chinese language saved in DB successfully`,
    );
    roku_PO.waitForAlias('@language', apiWaitTimeoutObj);
    roku_PO.waitForAlias('@languages', apiWaitTimeoutObj);
  });

  it('Validate filter and edit created language', () => {
    cy.get('[role="gridcell"]').should('exist');
    cy.contains('.button-primary', 'FILTERS').click();
    cy.contains('.mat-expansion-panel-header-title', ' Language Name ')
      .should('be.visible')
    cy.contains('.mat-expansion-panel-header-title', ' Code ')
    .should('be.visible')
    cy.contains('.mat-expansion-panel-header-title', ' Language Name ').click();
    roku_PO.clearThenFillPlaceholderForm(
      'Enter Language Name',
      'Invalid name',
    );
    cy.contains('[role="gridcell"]', 'Chinese').should('not.exist');
    roku_PO.clearThenFillPlaceholderForm('Enter Language Name', 'Chinese');
    cy.contains('[role="gridcell"]', 'Chinese').should('be.visible');
    cy.contains('[role="gridcell"]', 'Chinese')
      .parent()
      .find('.mat-menu-trigger')
      .click();
    cy.contains('.mat-menu-item', 'Edit').click();
    cy.wait(1000);
    cy.contains('Code*').parent().parent().parent().clear().type('ch-XX');
    cy.contains('.title', 'EDIT LANGUAGE').click();
    cy.contains('UPDATE').should('not.be.disabled').click();
    cy.contains('.button-dialog-primary', 'OK').click(); // dialog message is not validated
    roku_PO.interceptAlias('GET', '**api/roku/language**', 'language');
    roku_PO.expectDialogMessage(
      'Roku Chinese language updated successfully',
    );
    roku_PO.waitForAlias('@language', apiWaitTimeoutObj);
  });

  it('Verify regions grid page and create regions using created language', () => {
    cy.contains('[role="tab"]', 'REGIONS').click();
    cy.wait(1000);
    roku_PO.waitForLoad('div','regions-languages-table-container','table')
    cy.contains('.button-primary', 'CREATE NEW').click();
    roku_PO.validateErrorHaveText(0, ' Please enter Region Name ');
    roku_PO.validateErrorHaveText(1, ' Please enter Code ');
    roku_PO.validateErrorHaveText(
      2,
      ' Please select at least one language ',
    );
    cy.contains('Region Name*').parent().parent().parent().type('Chinese');
    cy.contains('Code*').parent().parent().parent().type('CS');
    cy.contains('.checkbox-label', 'ch-XX')
      .parent()
      .find('[type="checkbox"]')
      .check();
    cy.get('[role="combobox"]').should('contain', 'ch-XX');
    cy.contains('.button-secondary', 'SAVE').should('not.be.disabled').click();
    roku_PO.interceptAlias('POST', 'api/roku/language/save', 'language');
    roku_PO.expectDialogMessage('Do you wish to proceed with SAVE?');
    roku_PO.interceptAlias('GET', '**api/roku/country**', 'country');
    roku_PO.expectDialogMessage(
      'Roku Chinese country module saved as draft successfully',
    );
    roku_PO.waitForAlias('@country', apiWaitTimeoutObj);
  });

  it('Validate filter and edit created region', () => {
    cy.get('[role="gridcell"]').should('exist');
    cy.contains('.button-primary', 'FILTERS').click();
    cy.contains('.mat-expansion-panel-header-title', ' Region Name ')
      .should('be.visible')
      .click();
    roku_PO.clearThenFillPlaceholderForm(
      'Enter Region Name',
      'Invalid name',
    );
    cy.contains('[role="gridcell"]', 'Chinese').should('not.exist');
    roku_PO.clearThenFillPlaceholderForm('Enter Region Name', 'Chinese');
    cy.contains('[role="gridcell"]', 'Chinese').should('be.visible');
    cy.contains('[role="gridcell"]', 'Chinese')
      .parent()
      .find('.mat-menu-trigger')
      .click();
    cy.contains('.mat-menu-item', 'Edit').click();
    cy.contains('Code*').parent().parent().parent().clear().type('CQ');
    cy.contains('.title', 'EDIT REGION').click();
    cy.contains('UPDATE').should('not.be.disabled').click();
    cy.contains('.button-dialog-primary', 'OK').click(); // dialog message is not validated
    roku_PO.interceptAlias('GET', '**api/roku/country**', 'country');
    roku_PO.expectDialogMessage(
      'Roku Chinese country module updated successfully',
    );
    roku_PO.waitForAlias('@country', apiWaitTimeoutObj);
  });

  it('Delete region', () => {
    cy.contains('[role="tab"]', 'REGIONS').click();
    cy.wait(1000);
    cy.get('[role="gridcell"]').should('exist');
    cy.contains('.button-primary', 'FILTERS').click();
    cy.contains('.mat-expansion-panel-header-title', ' Region Name ')
      .should('be.visible')
      .click();
    roku_PO.clearThenFillPlaceholderForm('Enter Region Name', 'Chinese');
    cy.contains('[role="gridcell"]', 'Chinese').should('be.visible');
    cy.contains('[role="gridcell"]', 'Chinese')
      .parent()
      .find('.mat-menu-trigger')
      .click();
    cy.contains('.mat-menu-item', 'Delete').click();
    roku_PO.expectDialogMessage(
      `Do you wish to proceed with DELETE "Chinese"?`,
    );
    roku_PO.interceptAlias('GET', '**api/roku/country**', 'country');
    roku_PO.expectDialogMessage(
      `Roku Chinese country deleted successfully`,
    );
    roku_PO.waitForAlias('@country', apiWaitTimeoutObj);
  });
  
  it('Delete language', () => {
    cy.contains('[role="tab"]', 'LANGUAGES').click();
    cy.wait(1000);
    cy.get('[role="gridcell"]').should('exist');
    cy.contains('.button-primary', 'FILTERS').click();
    cy.contains('.mat-expansion-panel-header-title', ' Language Name ')
      .should('be.visible')
      .click();
    roku_PO.clearThenFillPlaceholderForm('Enter Language Name', 'Chinese');
    cy.contains('[role="gridcell"]', 'Chinese').should('be.visible');
    cy.contains('[role="gridcell"]', 'Chinese')
      .parent()
      .find('.mat-menu-trigger')
      .click();
    cy.contains('.mat-menu-item', 'Delete').click();
    roku_PO.expectDialogMessage(
      `Do you wish to proceed with DELETE "Chinese"?`,
    );
    roku_PO.interceptAlias('GET', '**api/roku/language**', 'language');
    roku_PO.expectDialogMessage(
      `Roku Chinese language deleted successfully`,
    );
    roku_PO.waitForAlias('@language', apiWaitTimeoutObj);
  });
})