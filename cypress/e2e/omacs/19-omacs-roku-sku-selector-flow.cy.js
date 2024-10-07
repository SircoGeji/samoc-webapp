/// <reference types="cypress-xpath" />

import 'cypress-localstorage-commands';
import 'cypress-real-events';
import Roku_PO from '../../support/pageObject/roku/roku_PO';

context('SKU flow', () => {
  const roku_PO = new Roku_PO();
  const apiWaitTimeout = 10000;
  const apiWaitTimeoutObj = { timeout: apiWaitTimeout };
  const typeDelay = { delay: 0 };
  const ENV_SERVER_URL = Cypress.env('ENV_SERVER_URL');
  let savedSkuId;
  let savedSelectorId;
  let duplicatedSkuId;
  let duplicatedSelectorId;
  let randomString;
  let randomStoreSkuJson;
  let randomLinkId;
  before(() => {
    localStorage.clear();
    cy.customPostUserData();
    cy.saveLocalStorage();
    cy.fixture('SKU-Roku').then((data) => {
      globalThis.data = data;
    });
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

  it('Set headers and verify SKU grid page', () => {
    roku_PO.navigateToSamocSkuPage(apiWaitTimeout);
    roku_PO.setHeaders('ROKU', 'twlght ', 'SKU');
    cy.contains('[role="tab"]', 'SKU').click();
    roku_PO.interceptAlias('GET', '/health', 'health');
    roku_PO.waitForAlias('@health', apiWaitTimeoutObj);
  });
  it('Validate initial form of a SKU', () => {
    cy.contains('.button-primary', 'CREATE NEW').click();
    cy.get('[type="text"]').each((el) => {
      cy.wrap(el).should('be.empty');
    });
    roku_PO.validateErrorHaveText(0, ' Please enter SKU Name ');
    roku_PO.validateErrorHaveText(1, ' Please enter Store SKU ID ');
  });

  it('validate SKU checkboxes are checked', () => {
    cy.get('.cell-container')
      .children('.boolean-type-container')
      .should('exist');
    cy.get('[type="checkbox"]').each(($el) => {
      cy.wrap($el).check();
      cy.wait(1000);
    });
  });
  it('Validate saving SKU into payload', () => {
    randomString = generateRandomString(3);
    randomStoreSkuJson = `${data.storeSkuId}` + `${randomString}`;
    randomLinkId = `${data.linkId}` + `${randomString}`;
    roku_PO.clearThenFillEmptyForm('skuName', data.name, typeDelay);
    roku_PO.clearThenFillEmptyForm(
      'store_SKU_ID',
      randomStoreSkuJson,
      typeDelay,
    );
    roku_PO.clearThenFillEmptyForm('linkID', randomLinkId, typeDelay);
    cy.contains('.region-button', 'US').click();
    cy.contains('Price*')
      .parents('.mat-form-field-infix')
      .find('[type="text"]')
      .clear()
      .type(data.countries.US.languages['en-US'].price, typeDelay);
    cy.contains('Currency*')
      .parents('.mat-form-field-infix')
      .find('[type="text"]')
      .clear()
      .type(data.countries.US.languages['en-US'].currency, typeDelay);
    const array = Object.values(data.countries.US.languages['en-US']);
    cy.contains('.cell-container', 'en-US')
      .parent()
      .find('.sku-form-input')
      .each(($el, index) => {
        if (index < 3) {
          roku_PO.clearThenFillEmptyTableForm(
            $el,
            0,
            array[index + 2],
            typeDelay,
          );
        }
      });
    cy.contains('.cell-container', 'en-US')
      .parent()
      .find('.sku-form-input')
      .each(($el, index) => {
        if (index > 3 && index < 7) {
          roku_PO.clearThenFillEmptyTableForm(
            $el,
            0,
            array[index + 1],
            typeDelay,
          );
        }
      });
    roku_PO.interceptAlias('POST', '**/api/roku/sku/save**', 'SkuPayLoad');
    cy.contains('SAVE').click();
    cy.contains('[role="menuitem"]', 'SAVE ALL').click();
    cy.wait('@SkuPayLoad').then(({ request, response }) => {
      savedSkuId = response.body.data.skuId;
    });
    roku_PO.expectOverlayMessage(
      `Roku ${data.name} Sku module saved in DB successfully`,
    );
    roku_PO.interceptAlias('GET', '/health', 'health');
    cy.get('.backbtn').click();
    roku_PO.waitForAlias('@health', apiWaitTimeoutObj);
  });
  it('Edit created Sku', () => {
    roku_PO.validateGridCellContains(data.name, 1, savedSkuId);
    roku_PO.validateGridCellContains(data.name, 2, data.linkId);
    roku_PO.validateGridCellContains(data.name, 3, 'Complete');
    roku_PO.validateGridCellContains(data.name, 4, 'US');
    cy.wait(1000);
    cy.contains('[role="gridcell"]', data.name)
      .parent()
      .find('.mat-menu-trigger')
      .should('not.be.disabled')
      .click();
    roku_PO.interceptAlias('GET', '/api/roku/sku', 'sku');
    cy.get('.mat-menu-item').then((el) => {
      cy.wrap(el).contains('Duplicate').should('exist');
      cy.wrap(el).contains('Archive').should('exist');
    });
    cy.get('.mat-menu-item').contains('Edit').click();
    roku_PO.waitForAlias('@sku', apiWaitTimeoutObj);
    cy.contains('.cell-container', 'en-US')
      .parent()
      .find('.sku-form-input')
      .then(($el) => {
        roku_PO.clearThenFillEmptyTableForm(
          $el,
          3,
          'English Edited',
          typeDelay,
        );
      });
    cy.contains('UPDATE').click();
    cy.contains('[role="menuitem"]', 'UPDATE ALL').click();
    roku_PO.expectDialogMessage(
      `Roku ${data.name} Sku module updated in DB successfully`,
    );
    roku_PO.interceptAlias('GET', '/health', 'health');
    cy.get('.backbtn').click();
    roku_PO.waitForAlias('@health', apiWaitTimeoutObj);
    cy.wait(1000);
  });
  it('Duplicate SKU', () => {
    cy.contains('[role="gridcell"]', data.name)
      .parent()
      .find('.mat-menu-trigger')
      .click();
    roku_PO.interceptAlias('GET', '/api/roku/sku', 'sku');
    cy.get('.mat-menu-item').then((el) => {
      cy.wrap(el).contains('Duplicate').should('exist');
      cy.wrap(el).contains('Archive').should('exist');
    });
    cy.contains('.mat-menu-item', 'Duplicate').click();
    roku_PO.waitForAlias('@sku', apiWaitTimeoutObj);
    roku_PO.validateFormControlContains('skuName', data.name + ' Copy');
    roku_PO.validateFormControlContains(
      'store_SKU_ID',
      randomStoreSkuJson + ' Copy',
    );
    roku_PO.validateFormControlContains('linkID', randomLinkId + ' Copy');
    cy.contains('Price*')
      .parent()
      .parent()
      .parent()
      .find('[type="text"]')
      .should('have.value', data.countries.US.languages['en-US'].price);
    cy.contains('Currency*')
      .parent()
      .parent()
      .parent()
      .find('[type="text"]')
      .should('have.value', data.countries.US.languages['en-US'].currency);
    roku_PO.interceptAlias('POST', '**/api/roku/sku/save**', 'SkuPayLoad');
    cy.contains('SAVE').click();
    cy.contains('[role="menuitem"]', 'SAVE ALL').click();
    cy.wait('@SkuPayLoad').then(({ response }) => {
      duplicatedSkuId = response.body.data.skuId;
    });
    roku_PO.expectOverlayMessage(
      `Roku ${data.name} Copy Sku module saved in DB successfully`,
    );
    roku_PO.interceptAlias('GET', '/health', 'health');
    cy.get('.backbtn').click();
    roku_PO.waitForAlias('@health', apiWaitTimeoutObj);
  });
  it('Archive duplicated SKU', () => {
    cy.contains('[role="gridcell"]', data.name + ' Copy')
      .parent()
      .find('.mat-menu-trigger')
      .click();
    cy.contains('.mat-menu-item', 'Archive').click();
    roku_PO.interceptAlias('PUT', '**archive**', 'archive');
    roku_PO.expectDialogMessage('Do you wish to proceed with ARCHIVE?');
    roku_PO.interceptAlias('GET', '/health', 'health');
    roku_PO.waitForAlias('@archive', apiWaitTimeoutObj);
    roku_PO.expectDialogMessage(
      `Roku ${data.name} Copy Sku module archived in DB successfully`,
    );
    roku_PO.waitForAlias('@health', apiWaitTimeoutObj);
    cy.contains('[role="gridcell"]', data.name + ' Copy').should('not.exist');
    cy.contains('.mat-checkbox-label', 'Show Archived')
      .parent('.mat-checkbox-layout')
      .find('[type="checkbox"]')
      .click({ force: true });
    cy.contains('[role="gridcell"]', data.name + ' Copy').should('be.visible');
    roku_PO.validateGridCellContains(data.name + ' Copy', 3, 'Archived');
  });
  it('Validate SKU filter', () => {
    cy.get('[role="gridcell"]').should('exist');
    cy.contains('.button-primary', 'FILTERS').click();
    cy.wait(apiWaitTimeout);
    cy.contains('.mat-expansion-panel-header-title', 'SKU NAME').click();
    cy.get('[placeholder="Enter Sku Name"]').type('Invalid name');
    cy.contains('[role="gridcell"]', data.name + ' Copy').should('not.exist');
    cy.get('[placeholder="Enter Sku Name"]').clear();
    cy.contains('[role="gridcell"]', data.name + ' Copy').should('be.visible');
    cy.contains('.button-primary', 'FILTERS').click();
  });
  it('Verify selector config grid page', () => {
    cy.contains('SELECTOR CONFIG').click();
    cy.wait(1000);
    roku_PO.waitForLoad('div', 'sku-table-container', 'table');
  });
  it('Create selector config using created SKU', () => {
    cy.contains('SELECTOR CONFIG').click();
    cy.wait(1000);
    cy.contains('.button-primary', 'CREATE NEW')
      .should('not.be.disabled')
      .click();
    cy.wait(3000);
    roku_PO.clearThenFillEmptyForm(
      'selectorConfigName',
      'Cypress selectorConfigName' + `${randomString}`,
      typeDelay,
    );
    cy.contains('.region-button', 'US').click();
    cy.contains(data.name).should('exist');
    roku_PO.interceptAlias(
      'POST',
      '**/api/roku/selector-config/save**',
      'selectorPayload',
    );
    cy.contains('SAVE').click();
    cy.contains('[role="menuitem"]', 'SAVE ALL').click();
    roku_PO.expectDialogMessage('SAVE ALL?');
    cy.wait('@selectorPayload').then(({ response }) => {
      savedSelectorId = response.body.data.selectorConfigId;
    });
    roku_PO.expectDialogMessage(
      `Roku Cypress selectorConfigName${randomString} SelectorConfig module saved in DB successfully`,
    );
    roku_PO.interceptAlias('GET', '/health', 'health');
    cy.get('.backbtn').click();
    roku_PO.waitForAlias('@health', apiWaitTimeoutObj);
  });
  it('Edit created selector config', () => {
    cy.wait(1000);
    cy.contains(
      '[role="gridcell"]',
      `Cypress selectorConfigName${randomString}`,
    )
      .parent()
      .find('.mat-menu-trigger')
      .click();
    roku_PO.interceptAlias('GET', '/api/roku/selector-config**', 'selector');
    cy.contains('.mat-menu-item', 'Edit').click();
    roku_PO.waitForAlias('@selector', apiWaitTimeoutObj);
    cy.contains('.selector-config-form-cell-container', data.name)
      .parent()
      .then(($el) => {
        cy.wrap($el)
          .find('[formcontrolname="price"]')
          .should('have.value', data.countries.US.languages['en-US'].price);
        cy.wrap($el)
          .find('[type="checkbox"]')
          .filter('[formcontrolname="showInSelector"]')
          .check();
        cy.wrap($el)
          .find('[type="checkbox"]')
          .filter('[formcontrolname="showInSettings"]')
          .check();
      });
    cy.contains('UPDATE').click();
    cy.contains('[role="menuitem"]', 'UPDATE ALL').click();
    roku_PO.expectDialogMessage('UPDATE ALL?');
    roku_PO.expectDialogMessage(
      `Roku Cypress selectorConfigName${randomString} SelectorConfig module updated in DB successfully`,
    );
    roku_PO.interceptAlias('GET', '/health', 'health');
    cy.get('.backbtn').click();
    roku_PO.waitForAlias('@health', apiWaitTimeoutObj);
  });
  it('Duplicate selector config', () => {
    roku_PO.interceptAlias('GET', '/api/roku/selector-config**', 'selector');
    cy.contains(
      '[role="gridcell"]',
      `Cypress selectorConfigName${randomString}`,
    )
      .parent()
      .find('.mat-menu-trigger')
      .click();
    cy.contains('.mat-menu-item', 'Duplicate').click();
    roku_PO.waitForAlias('@selector', apiWaitTimeoutObj);
    cy.get('[formcontrolname="selectorConfigName"]').should(
      'have.value',
      `Cypress selectorConfigName${randomString} Copy`,
    );
    cy.contains('.selector-config-form-cell-container', data.name)
      .parent()
      .then(($el) => {
        cy.wrap($el)
          .find('[formcontrolname="price"]')
          .should('have.value', data.countries.US.languages['en-US'].price);
        cy.wrap($el)
          .find('[type="checkbox"]')
          .filter('[formcontrolname="showInSelector"]')
          .should('be.checked');
        cy.wrap($el)
          .find('[type="checkbox"]')
          .filter('[formcontrolname="showInSettings"]')
          .should('be.checked');
      });
    roku_PO.interceptAlias(
      'POST',
      '**/api/roku/selector-config/save**',
      'selectorPayload',
    );
    cy.contains('SAVE').click();
    cy.contains('[role="menuitem"]', 'SAVE ALL').click();
    roku_PO.expectDialogMessage('SAVE ALL?');
    cy.wait('@selectorPayload').then(({ response }) => {
      duplicatedSelectorId = response.body.data.selectorConfigId;
    });
    roku_PO.expectDialogMessage(
      `Roku Cypress selectorConfigName${randomString} Copy SelectorConfig module saved in DB successfully`,
    );
    roku_PO.interceptAlias('GET', '/health', 'health');
    cy.get('.backbtn').click();
    roku_PO.waitForAlias('@health', apiWaitTimeoutObj);
  });
  it('Validate selector config filter', () => {
    cy.get('[role="gridcell"]').should('exist');
    cy.contains('.button-primary', 'FILTERS').click();
    cy.contains('.mat-expansion-panel-header', 'NAME').click();
    cy.get('[placeholder="Enter Selector Config Name"]').type('Invalid name');
    cy.contains(
      '[role="gridcell"]',
      `Cypress selectorConfigName${randomString}`,
    ).should('not.exist');
    cy.get('[placeholder="Enter Selector Config Name"]').clear();
    cy.contains(
      '[role="gridcell"]',
      `Cypress selectorConfigName${randomString}`,
    ).should('be.visible');
    cy.contains('.button-primary', 'FILTERS').click();
  });
  it('Delete selector configs', () => {
    cy.wait(1000);
    cy.contains(
      '[role="gridcell"]',
      `Cypress selectorConfigName${randomString} Copy`,
    )
      .parent()
      .find('.mat-menu-trigger')
      .should('not.be.disabled')
      .click();
    cy.contains('.mat-menu-item', 'Delete').click();
    roku_PO.expectDialogMessage(
      `Do you wish to proceed with DELETE "Cypress selectorConfigName${randomString} Copy"?`,
    );
    roku_PO.interceptAlias('GET', '/health', 'health');
    roku_PO.expectDialogMessage(
      `Roku Cypress selectorConfigName${randomString} Copy SelectorConfig module deleted from DB successfully`,
    );
    roku_PO.waitForAlias('@health', apiWaitTimeoutObj);
    // roku_PO.deleteUsingAPI(ENV_SERVER_URL, 'selector-config', duplicatedSelectorId) currently delete through interface
    roku_PO.deleteUsingAPI(ENV_SERVER_URL, 'selector-config', savedSelectorId);
  });
  it('Delete saved SKUs', () => {
    roku_PO.deleteUsingAPI(ENV_SERVER_URL, 'sku', savedSkuId);
    roku_PO.deleteUsingAPI(ENV_SERVER_URL, 'sku', duplicatedSkuId);
  });
});
