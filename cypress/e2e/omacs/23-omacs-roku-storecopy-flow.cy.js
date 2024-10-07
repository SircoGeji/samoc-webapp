/// <reference types="cypress-xpath" />

import 'cypress-localstorage-commands';
import 'cypress-real-events';
import Roku_PO from '../../support/pageObject/roku/roku_PO';

const generateRandomString = (length) => {
  const characters = 'abcdefghijklmnopqrstuvwxyz';
  let result = '';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
  1;
};
context('Store copy flow', () => {
  const roku_PO = new Roku_PO();
  const apiWaitTimeout = 60000;
  const apiWaitTimeoutObj = { timeout: apiWaitTimeout };
  const typeDelay = { delay: 0 };
  const ENV_SERVER_URL = Cypress.env('ENV_SERVER_URL');
  let savedStoreCopyId;
  // let duplicatedStoreCopyId;
  let randomString = generateRandomString(3);
  before(() => {
    cy.setLocalStorageClear();
    cy.customPostUserData();
    cy.saveLocalStorage();
    cy.fixture('StoreCopy-Roku').then((data) => {
      globalThis.data = data;
    });
  });
  beforeEach(() => {
    cy.setViewPort();
  });
  it('Set headers and click create store copy', () => {
    roku_PO.navigateToSamocSkuPage(apiWaitTimeout);
    roku_PO.interceptAlias('GET', '**api/roku/store-copy**', 'storecopy');
    roku_PO.setHeaders('ROKU', 'twlght ', 'STORE COPY');
    roku_PO.waitForAlias('@storecopy', apiWaitTimeoutObj);
    roku_PO.interceptAlias(
      'GET',
      '**api/roku/store-copy/fields**',
      'storecopyform',
    );
    cy.wait(2000);
    cy.contains('.button-primary', 'CREATE NEW').click();
    roku_PO.waitForAlias('@storecopyform', apiWaitTimeoutObj);
  });
  it('Validate saving store copy', () => {
    roku_PO.clearThenFillEmptyForm(
      'storeCopyName',
      data.name + randomString,
      typeDelay,
    );
    cy.get('.region-button').eq(0).click();
    
    const usTableData = data.languages['en-US'].tableData;
    for (const key in usTableData) {
      if (!usTableData.hasOwnProperty(key)) {
        continue;
      }

      roku_PO.clearThenFillEmptyContain(key, usTableData[key]);
    }
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
    roku_PO.interceptAlias(
      'POST',
      '**/api/roku/store-copy/save**',
      'StoreCopyPayload',
    );
    cy.contains('SAVE').click();
    cy.contains('[role="menuitem"]', 'SAVE ALL').click();
    roku_PO.expectDialogMessage('Do you wish to proceed with  SAVE ALL?');
    cy.wait('@StoreCopyPayload').then(({ response }) => {
      savedStoreCopyId = response.body.data.storeCopyId;
    });
    roku_PO.expectDialogMessage(
      `Roku ${data.name}${randomString} StoreCopy module saved in DB successfully`,
    );
    roku_PO.interceptAlias('GET', '**api/roku/store-copy**', 'storecopy');
    cy.get('.backbtn').click();
    roku_PO.waitForAlias('@storecopy', apiWaitTimeoutObj);
  });
  it('Validate filter and edit created store copy', () => {
    cy.get('[role="gridcell"]').should('exist');
    cy.contains('.button-primary', 'FILTERS').click();
    cy.contains('.mat-expansion-panel-header-title', 'TITLE')
      .should('be.visible')
      .click();
    roku_PO.clearThenFillPlaceholderForm('Enter Package Name', 'Invalid name');
    cy.contains('[role="gridcell"]', data.name + randomString).should(
      'not.exist',
    );
    roku_PO.clearThenFillPlaceholderForm(
      'Enter Package Name',
      data.name + randomString,
    );
     roku_PO.validateGridCellContains(data.name + randomString, 1, 'Ready');
    roku_PO.clickDotMenuOption(data.name + randomString, 'Edit');
    cy.contains('Store Copy Name')
      .parent()
      .parent()
      .find('.mat-input-element')
      .should('have.value', data.name + randomString);
    roku_PO.clearThenFillEmptyContain(
      ' screenShot1 ',
      data.languages['en-US'].tableData.screenShot3,
    );
    cy.contains('UPDATE').should('not.be.disabled').click();
    roku_PO.interceptAlias('PUT', '**/update**', 'storecopyupdate');
    cy.contains('[role="menuitem"]', 'UPDATE ALL').click();
    roku_PO.expectDialogMessage('Do you wish to proceed with  UPDATE ALL?');
    roku_PO.waitForAlias('@storecopyupdate', apiWaitTimeoutObj);
    roku_PO.expectDialogMessage(
      `Roku ${data.name}${randomString} StoreCopy module updated in DB successfully`,
    );
    roku_PO.interceptAlias('GET', '**api/roku/store-copy**', 'storecopy');
    cy.get('.backbtn').click();
    roku_PO.waitForAlias('@storecopy', apiWaitTimeoutObj);
  });
  it('Duplicate store copy', () => {
    cy.get('[role="gridcell"]').should('exist');
    cy.contains('.button-primary', 'FILTERS').click();
    cy.contains('.mat-expansion-panel-header-title', 'TITLE')
      .should('be.visible')
      .click();
    roku_PO.clearThenFillPlaceholderForm(
      'Enter Package Name',
      data.name + randomString,
    );
    roku_PO.interceptAlias('GET', '**api/roku/store-copy**', 'storecopy');
    roku_PO.clickDotMenuOption(data.name + randomString, 'Duplicate');
    roku_PO.waitForAlias('@storecopy', apiWaitTimeoutObj);
    cy.wait(5000);
    roku_PO.clearThenFillEmptyContain(
      'Store Copy Name',
      data.name + randomString,
    );
    cy.get('body').click(0, 0);
    // cy.contains('.store-name', 'GOOGLE').click();
    roku_PO.validateErrorHaveText(0, ' This Store Copy Name already exists ');
    roku_PO.clearThenFillEmptyContain(
      'Store Copy Name',
      `${data.name}${randomString}  duplicated`,
    );
    // cy.contains('.store-name', 'GOOGLE').click();
    roku_PO.interceptAlias(
      'POST',
      '**/api/roku/store-copy/save**',
      'StoreCopyPayload',
    );
    cy.get('body').click(0, 0);
    cy.contains('SAVE').click();
    cy.contains('[role="menuitem"]', 'SAVE ALL').click();
    roku_PO.expectDialogMessage('Do you wish to proceed with  SAVE ALL?');
    cy.wait('@StoreCopyPayload').then(({ response }) => {
     let duplicatedStoreCopyId = response.body.data.storeCopyId;
    });
    roku_PO.expectDialogMessage(
      `Roku ${data.name}${randomString}  duplicated StoreCopy module saved in DB successfully`,
    );
    roku_PO.interceptAlias('GET', '**api/roku/store-copy**', 'storecopy');
    cy.get('.backbtn').click();
    roku_PO.waitForAlias('@storecopy', apiWaitTimeoutObj);
  });
  it('Delete store copies', () => {
    cy.get('[role="gridcell"]').should('exist');
    cy.contains('.button-primary', 'FILTERS').click();
    cy.contains('.mat-expansion-panel-header-title', 'TITLE')
      .should('be.visible')
      .click();
    roku_PO.clearThenFillPlaceholderForm(
      'Enter Package Name',
      data.name + randomString,
    );
    cy.contains(
      '[role="gridcell"]',
      data.name + randomString,
      'duplicated',
    ).should('be.visible');
    roku_PO.clickDotMenuOption(data.name + randomString, 'Delete');
    roku_PO.expectDialogMessage(
      'Do you wish to proceed with DELETE',
      data.name + randomString,
      'duplicated?',
    );
    roku_PO.interceptAlias('GET', '**api/roku/store-copy**', 'storecopy');
    roku_PO.expectDialogMessage(
      'Roku',
      data.name + randomString,
      'duplicated StoreCopy module deleted from DB successfully',
    );
    roku_PO.waitForAlias('@storecopy', apiWaitTimeoutObj);
    roku_PO.deleteUsingAPI(ENV_SERVER_URL, 'store-copy', savedStoreCopyId);
  });
});
