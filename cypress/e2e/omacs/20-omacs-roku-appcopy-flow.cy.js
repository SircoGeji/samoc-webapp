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
let randomString = generateRandomString(3);

context('App copy flow', () => {
  const roku_PO = new Roku_PO();
  const apiWaitTimeout = 15000;
  const apiWaitTimeoutObj = { timeout: apiWaitTimeout };
  const typeDelay = { delay: 0, force: true };
  const ENV_SERVER_URL = Cypress.env('ENV_SERVER_URL');
  let savedAppCopyId;
  let duplicatedAppCopyId;
  const selectPlatform = (platform) => {
    cy.get('.app-copy-switch-tab-buttons-container').contains(platform).click();
  };
  before(() => {
    cy.setLocalStorageClear();
    cy.customPostUserData();
    cy.saveLocalStorage();
    cy.fixture('AppCopy-Roku').then((data) => {
      globalThis.data = data;
    });
  });
  beforeEach(() => {
    cy.setViewPort();
  });
  it('Set headers and verify app copy grid page', () => {
    roku_PO.navigateToSamocSkuPage(apiWaitTimeout);
    roku_PO.interceptAlias('GET', '**api/roku/app-copy**', 'appcopy');
    roku_PO.setHeaders('ROKU', 'twlght', 'APP COPY');
    roku_PO.waitForAlias('@appcopy', apiWaitTimeoutObj);
    roku_PO.waitForLoad('div', 'app-copy-table-container', 'table');
  });
  it('Verify app copy form and create new app copy', () => {
    roku_PO.interceptAlias(
      'GET',
      '**api/roku/app-copy/fields**',
      'appcopyform',
    );
    cy.contains('.button-primary', 'CREATE NEW').click();
    roku_PO.waitForAlias('@appcopyform', apiWaitTimeoutObj);
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
    selectPlatform('10ft COPY');
    const arraytv = Object.values(data.platforms.tv.US.languages['en-US']);
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
        roku_PO.clearThenFillEmptyTableForm($el, 0, arraytv[index ], typeDelay);
      });
    roku_PO.interceptAlias(
      'POST',
      '**/api/roku/app-copy/save**',
      'AppCopyPayload',
    );
    cy.wait(3000);
    cy.contains('SAVE').click();
    cy.contains('[role="menuitem"]', 'SAVE ALL').click();
    roku_PO.expectDialogMessage('Do you wish to proceed with  SAVE ALL?');
    cy.wait('@AppCopyPayload').then(({ request, response }) => {
      // expect(JSON.stringify(request.body)).to.eq(JSON.stringify(data));
      savedAppCopyId = response.body.data.appCopyId;
    });
    roku_PO.expectDialogMessage(
      `Roku ${data.name}${randomString} AppCopy module saved in DB successfully`,
    );
    roku_PO.interceptAlias('GET', '**api/roku/app-copy**', 'appcopy');
    cy.get('.backbtn').click();
    roku_PO.waitForAlias('@appcopy', apiWaitTimeoutObj);
  });

  it('Validate filter', () => {
    cy.get('[role="gridcell"]').should('exist');
    cy.contains('.button-primary', 'FILTERS').click();
    cy.contains('.mat-expansion-panel-header-title', 'COPY PACKAGE NAME')
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
    cy.contains('[role="gridcell"]', data.name + randomString).should('exist');
  });

  it(' Edit created App Copy', () => {
    roku_PO.clickDotMenuOption(data.name + randomString, 'Edit');
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
    cy.contains('UPDATE').should('not.be.disabled').click();
    roku_PO.interceptAlias('PUT', '**/update**', 'appcopyupdate');
    cy.contains('[role="menuitem"]', 'UPDATE ALL').click();
    roku_PO.expectDialogMessage('Do you wish to proceed with  UPDATE ALL?');
    roku_PO.waitForAlias('@appcopyupdate', apiWaitTimeoutObj);
    roku_PO.expectDialogMessage(
      `Roku ${data.name}${randomString} AppCopy module updated in DB successfully`,
    );
    roku_PO.interceptAlias('GET', '**api/roku/app-copy**', 'appcopy');
    cy.get('.backbtn').click();
    roku_PO.waitForAlias('@appcopy', apiWaitTimeoutObj);
  });

  it('Duplicate app copy', () => {
    cy.get('[role="gridcell"]').should('exist');
    cy.contains('.button-primary', 'FILTERS').click();
    cy.contains('.mat-expansion-panel-header-title', 'COPY PACKAGE NAME')
      .should('be.visible')
      .click();
    roku_PO.clearThenFillPlaceholderForm('Enter Package Name', data.name + randomString);
    roku_PO.interceptAlias('GET', '**api/roku/app-copy**', 'appcopy');
    roku_PO.clickDotMenuOption(data.name + randomString, 'Duplicate');
    roku_PO.waitForAlias('@appcopy', apiWaitTimeoutObj);
    cy.get('.app-copy-form-input').should('exist').and('not.be.disabled');
    cy.contains('App Copy Name*')
      .parent()
      .parent()
      .find('.mat-input-element')
      .clear()
      .type(data.name + randomString);
    selectPlatform('10ft COPY');
    roku_PO.validateErrorHaveText(0, ' This App Copy Name already exists ');
    cy.contains('App Copy Name*')
      .parent()
      .parent()
      .find('.mat-input-element')
      .clear()
      .type(data.name + randomString + 'duplicated');
    // cy.get('.app-copy-form-input').clickOutside();
    roku_PO.interceptAlias(
      'POST',
      '**/api/roku/app-copy/save**',
      'AppCopyPayload',
    );
    selectPlatform('10ft COPY');
    cy.contains('SAVE').click();
    cy.contains('[role="menuitem"]', 'SAVE ALL').click();
    roku_PO.expectDialogMessage('Do you wish to proceed with  SAVE ALL?');
    cy.wait('@AppCopyPayload').then(({ response }) => {
      duplicatedAppCopyId = response.body.data.appCopyId;
    });
    roku_PO.expectDialogMessage(
      `Roku ${data.name}${randomString}duplicated AppCopy module saved in DB successfully`,
    );
    roku_PO.interceptAlias('GET', '**api/roku/app-copy**', 'appcopy');
    cy.get('.backbtn').click();
    roku_PO.waitForAlias('@appcopy', apiWaitTimeoutObj);
  });
  it('Delete app copies', () => {
    cy.get('[role="gridcell"]').should('exist');
    cy.contains('.button-primary', 'FILTERS').click();
    cy.contains('.mat-expansion-panel-header-title', 'COPY PACKAGE NAME')
      .should('be.visible')
      .click();
    roku_PO.clearThenFillPlaceholderForm('Enter Package Name', data.name) + randomString;
    cy.contains('[role="gridcell"]', data.name + randomString + 'duplicated').should(
      'be.visible',
    );
    roku_PO.clickDotMenuOption(data.name + randomString + 'duplicated', 'Delete');
    roku_PO.expectDialogMessage(
      `Do you wish to proceed with DELETE "${data.name}${randomString}duplicated"?`,
    );
    roku_PO.interceptAlias('GET', '**api/roku/app-copy**', 'appcopy');
    roku_PO.expectDialogMessage(
      `Roku ${data.name}${randomString}duplicated AppCopy module deleted from DB successfully`,
    );
    roku_PO.waitForAlias('@appcopy', apiWaitTimeoutObj);
    roku_PO.deleteUsingAPI(ENV_SERVER_URL, 'app-copy', savedAppCopyId);
  });
});
