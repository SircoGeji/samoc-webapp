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

context('SKU flow', () => {
  const android_PO = new Android_PO();
  const apiWaitTimeout = 10000;
  const apiWaitTimeoutObj = { timeout: apiWaitTimeout };
  const typeDelay = { delay: 0 };
  const ENV_SERVER_URL = Cypress.env('ENV_SERVER_URL');
  const waitForLoad = 5000
  let savedSkuId;
  let savedSelectorId;
  let duplicatedSkuId;
  let duplicatedSelectorId;
  let randomString;
  let randomStoreSkuJson;
  let randomParentSkuJson;
  let randomLinkId;

  before(() => {
    cy.setLocalStorageClear();
    cy.customPostUserData();
    cy.saveLocalStorage();
    cy.fixture('SKU-Android').then((data) => {
      globalThis.data = data;
    });
  });
  beforeEach(() => {
    cy.setViewPort();
  });
  it('Set headers and click create SKU', () => {
    android_PO.navigateToSamocSkuPage(apiWaitTimeout);
    android_PO.setHeaders('ANDROID', 'GOOGLE', 'twlght ', 'SKU');
    cy.contains('[role="tab"]', 'SKU').click();
    android_PO.interceptAlias('GET', '/health', 'health');
    cy.contains('.button-primary', 'CREATE NEW').click();
    android_PO.waitForAlias('@health', apiWaitTimeoutObj);
  });

  it('Validate initial form of a SKU', () => {
    cy.get('[type="text"]').each((el) => {
      cy.wrap(el).should('be.empty');
    });
    android_PO.validateErrorHaveText(0, ' Please enter SKU Name ');
    android_PO.validateErrorHaveText(1, ' Please enter Store Parent SKU ID ');
    android_PO.validateErrorHaveText(2, ' Please enter Store SKU ID ');
  });
  it('Validate saving SKU into payload', () => {
    randomString = generateRandomString(3);
    randomStoreSkuJson = `${data.storeSkuId}` + `${randomString}`;
    randomParentSkuJson = `${data.parentSkuId}` + `${randomString}`;
    randomLinkId = `${data.linkId}` + `${randomString}`;
    android_PO.clearThenFillEmptyForm('skuName', data.name, typeDelay);
    android_PO.clearThenFillEmptyForm(
      'store_SKU_ID',
      randomStoreSkuJson,
      typeDelay,
    );
    android_PO.clearThenFillEmptyForm(
      'store_parent_SKU_ID',
      randomParentSkuJson,
      typeDelay,
    );
    android_PO.clearThenFillEmptyForm('linkID', randomLinkId, typeDelay);
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
        if (index < 8) {
          android_PO.clearThenFillEmptyTableForm(
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
          android_PO.clearThenFillEmptyTableForm(
            $el,
            0,
            array[index + 1],
            typeDelay,
          );
        }
      });
    android_PO.interceptAlias(
      'POST',
      '**/api/android/sku/save**',
      'SkuPayLoad',
    );
    cy.wait(waitForLoad)
    cy.contains('SAVE').click();
    cy.contains('[role="menuitem"]', 'SAVE ALL').click();
    android_PO.expectDialogMessage('Do you wish to proceed with SAVE ALL?');
    cy.wait('@SkuPayLoad').then(({ request, response }) => {
      // expect(JSON.stringify(request.body)).to.eq(JSON.stringify(data));
      savedSkuId = response.body.data.skuId;
    });
    android_PO.expectDialogMessage(
      `Android ${data.name} Sku module saved in DB successfully`,
    );
    android_PO.interceptAlias('GET', '/health', 'health');
    cy.get('.backbtn').click();
    android_PO.waitForAlias('@health', apiWaitTimeoutObj);
  });
  it('Edit created Sku', () => {
    android_PO.validateGridCellContains(data.name, 1, savedSkuId);
    android_PO.validateGridCellContains(data.name, 2, data.linkId);
    android_PO.validateGridCellContains(data.name, 3, 'Complete');
    android_PO.validateGridCellContains(data.name, 4, 'US');
    cy.wait(1000);
    cy.contains('[role="gridcell"]', data.name)
      .parent()
      .find('.mat-menu-trigger')
      .should('not.be.disabled')
      .click();
    android_PO.interceptAlias('GET', '/api/android/sku', 'sku');
    cy.get('.mat-menu-item').then((el) => {
      cy.wrap(el).contains('Duplicate').should('exist');
      cy.wrap(el).contains('Archive').should('exist');
    });
    cy.get('.mat-menu-item').contains('Edit').click();
    android_PO.waitForAlias('@sku', apiWaitTimeoutObj);
    cy.contains('.cell-container', 'en-US')
      .parent()
      .find('.sku-form-input')
      .then(($el) => {
        android_PO.clearThenFillEmptyTableForm(
          $el,
          3,
          'English Edited',
          typeDelay,
        );
      });
    cy.contains('UPDATE').click();
    cy.contains('[role="menuitem"]', 'UPDATE ALL').click();
    android_PO.expectDialogMessage('Do you wish to proceed with UPDATE ALL?');
    android_PO.expectDialogMessage(
      `Android ${data.name} Sku module updated in DB successfully`,
    );
    android_PO.interceptAlias('GET', '/health', 'health');
    cy.get('.backbtn').click();
    android_PO.waitForAlias('@health', apiWaitTimeoutObj);
    cy.wait(1000);
  });
  it('Duplicate SKU', () => {
    cy.contains('[role="gridcell"]', data.name)
      .parent()
      .find('.mat-menu-trigger')
      .click();
    android_PO.interceptAlias('GET', '/api/android/sku', 'sku');
    cy.get('.mat-menu-item').then((el) => {
      cy.wrap(el).contains('Duplicate').should('exist');
      cy.wrap(el).contains('Archive').should('exist');
    });
    cy.contains('.mat-menu-item', 'Duplicate').click();
    android_PO.waitForAlias('@sku', apiWaitTimeoutObj);
    android_PO.validateFormControlContains('skuName', data.name + ' Copy');
    android_PO.validateFormControlContains(
      'store_SKU_ID',
      randomStoreSkuJson + ' Copy',
    );
    android_PO.validateFormControlContains(
      'store_parent_SKU_ID',
      randomParentSkuJson,
    );
    android_PO.validateFormControlContains('linkID', randomLinkId + ' Copy');
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
    android_PO.interceptAlias(
      'POST',
      '**/api/android/sku/save**',
      'SkuPayLoad',
    );
    cy.contains('SAVE').click();
    cy.contains('[role="menuitem"]', 'SAVE ALL').click();
    android_PO.expectDialogMessage('Do you wish to proceed with SAVE ALL?');
    cy.wait('@SkuPayLoad').then(({ response }) => {
      duplicatedSkuId = response.body.data.skuId;
    });
    android_PO.expectDialogMessage(
      `Android ${data.name} Copy Sku module saved in DB successfully`,
    );
    android_PO.interceptAlias('GET', '/health', 'health');
    cy.get('.backbtn').click();
    android_PO.waitForAlias('@health', apiWaitTimeoutObj);
  });
  it('Archive duplicated SKU', () => {
    cy.contains('[role="gridcell"]', data.name + ' Copy')
      .parent()
      .find('.mat-menu-trigger')
      .click();
    cy.contains('.mat-menu-item', 'Archive').click();
    android_PO.interceptAlias('PUT', '**archive**', 'archive');
    android_PO.expectDialogMessage('Do you wish to proceed with ARCHIVE?');
    android_PO.interceptAlias('GET', '/health', 'health');
    android_PO.waitForAlias('@archive', apiWaitTimeoutObj);
    android_PO.expectDialogMessage(
      `Android ${data.name} Copy Sku module archived in DB successfully`,
    );
    android_PO.waitForAlias('@health', apiWaitTimeoutObj);
    cy.contains('[role="gridcell"]', data.name + ' Copy').should('not.exist');
    cy.contains('.mat-checkbox-label', 'Show Archived')
      .parent('.mat-checkbox-layout')
      .find('[type="checkbox"]')
      .click({ force: true });
    cy.contains('[role="gridcell"]', data.name + ' Copy').should('be.visible');
    android_PO.validateGridCellContains(data.name + ' Copy', 3, 'Archived');
  });
  it('Validate SKU filter', () => {
    cy.get('[role="gridcell"]').should('exist');
    cy.contains('.button-primary', 'FILTERS').click();
    cy.contains('.mat-expansion-panel-header-title', 'SKU NAME').click();
    cy.get('[placeholder="Enter SKU Name"]').type('Invalid name');
    cy.contains('[role="gridcell"]', data.name + ' Copy').should('not.exist');
    cy.get('[placeholder="Enter SKU Name"]').clear();
    cy.contains('[role="gridcell"]', data.name + ' Copy').should('be.visible');
    cy.contains('.button-primary', 'FILTERS').click();
  });
  it('Create selector config using created SKU', () => {
    cy.contains('SELECTOR CONFIG').click();
    cy.wait(1000);
    cy.contains('.button-primary', 'CREATE NEW')
      .should('not.be.disabled')
      .click();
    cy.wait(3000);
    android_PO.clearThenFillEmptyForm(
      'selectorConfigName',
      'Cypress selectorConfigName' + `${randomString}`,
      typeDelay,
    );
    cy.contains('.region-button', 'US').click();
    cy.contains(data.name).should('exist');
    android_PO.interceptAlias(
      'POST',
      '**/api/android/selector-config/save**',
      'selectorPayload',
    );
    cy.contains('SAVE').click();
    cy.contains('[role="menuitem"]', 'SAVE ALL').click();
    android_PO.expectDialogMessage('SAVE ALL?');
    cy.wait('@selectorPayload').then(({ response }) => {
      savedSelectorId = response.body.data.selectorConfigId;
    });
    android_PO.expectDialogMessage(
      `Android Cypress selectorConfigName${randomString} SelectorConfig module saved in DB successfully`,
    );
    android_PO.interceptAlias('GET', '/health', 'health');
    cy.get('.backbtn').click();
    android_PO.waitForAlias('@health', apiWaitTimeoutObj);
  });
  it('Edit created selector config', () => {
    cy.wait(1000);
    cy.contains('[role="gridcell"]', `Cypress selectorConfigName${randomString}`)
      .parent()
      .find('.mat-menu-trigger')
      .click();
    android_PO.interceptAlias(
      'GET',
      '/api/android/selector-config**',
      'selector',
    );
    cy.contains('.mat-menu-item', 'Edit').click();
    android_PO.waitForAlias('@selector', apiWaitTimeoutObj);
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
    android_PO.expectDialogMessage('UPDATE ALL?');
    android_PO.expectDialogMessage(
      `Android Cypress selectorConfigName${randomString} SelectorConfig module updated in DB successfully`,
    );
    android_PO.interceptAlias('GET', '/health', 'health');
    cy.get('.backbtn').click();
    android_PO.waitForAlias('@health', apiWaitTimeoutObj);
  });
  it('Duplicate selector config', () => {
    android_PO.interceptAlias(
      'GET',
      '/api/android/selector-config**',
      'selector',
    );
    cy.contains('[role="gridcell"]', `Cypress selectorConfigName${randomString}`)
      .parent()
      .find('.mat-menu-trigger')
      .click();
    cy.contains('.mat-menu-item', 'Duplicate').click();
    android_PO.waitForAlias('@selector', apiWaitTimeoutObj);
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
    android_PO.interceptAlias(
      'POST',
      '**/api/android/selector-config/save**',
      'selectorPayload',
    );
    cy.contains('SAVE').click();
    cy.contains('[role="menuitem"]', 'SAVE ALL').click();
    android_PO.expectDialogMessage('SAVE ALL?');
    cy.wait('@selectorPayload').then(({ response }) => {
      duplicatedSelectorId = response.body.data.selectorConfigId;
    });
    android_PO.expectDialogMessage(
      `Android Cypress selectorConfigName${randomString} Copy SelectorConfig module saved in DB successfully`,
    );
    android_PO.interceptAlias('GET', '/health', 'health');
    cy.get('.backbtn').click();
    android_PO.waitForAlias('@health', apiWaitTimeoutObj);
  });
  it('Validate selector config filter', () => {
    cy.get('[role="gridcell"]').should('exist');
    cy.contains('.button-primary', 'FILTERS').click();
    cy.contains('.mat-expansion-panel-header', 'NAME').click();
    cy.get('[placeholder="Enter Selector Config Name"]').type('Invalid name');
    cy.contains('[role="gridcell"]', `Cypress selectorConfigName${randomString}`).should(
      'not.exist',
    );
    cy.get('[placeholder="Enter Selector Config Name"]').clear();
    cy.contains('[role="gridcell"]', `Cypress selectorConfigName${randomString}`).should(
      'be.visible',
    );
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
    android_PO.expectDialogMessage(
      `Do you wish to proceed with DELETE "Cypress selectorConfigName${randomString} Copy"?`,
    );
    android_PO.interceptAlias('GET', '/health', 'health');
    android_PO.expectDialogMessage(
      `Android Cypress selectorConfigName${randomString} Copy SelectorConfig module deleted from DB successfully`,
    );
    android_PO.waitForAlias('@health', apiWaitTimeoutObj);
    // android_PO.deleteUsingAPI(ENV_SERVER_URL, 'selector-config', duplicatedSelectorId) currently delete thourgh interface
    android_PO.deleteUsingAPI(
      ENV_SERVER_URL,
      'selector-config',
      savedSelectorId,
    );
  });
  it('Delete saved SKUs', () => {
    android_PO.deleteUsingAPI(ENV_SERVER_URL, 'sku', savedSkuId);
    android_PO.deleteUsingAPI(ENV_SERVER_URL, 'sku', duplicatedSkuId);
  });
});
