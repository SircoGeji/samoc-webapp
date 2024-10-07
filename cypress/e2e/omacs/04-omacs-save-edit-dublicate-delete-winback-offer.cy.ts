/// <reference types="cypress-xpath" />
import * as moment from 'moment';
import 'cypress-localstorage-commands';
import 'cypress-wait-until';
import Web_PO from '../../support/pageObject/web/web_PO';

context('Save, edit, duplicate and delete winback offers', () => {
  const characters = 'abcdefghijklmnopqrstuvwxyz';
  const generateRandomString = (length: number) => {
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    return result;
  };

  const offerCode1 = generateRandomString(6);
  const dateString = moment().format('YYMMDD');

  const envUrl = Cypress.env('ENV_URL');
  const offersUrl = envUrl + Cypress.env('OFFERS_URL');
  const imageUrl = Cypress.env('STOCK_IMAGE_URL');

  let offerPrefix = '';
  if (Cypress.env('ENV') !== 'PROD') {
    offerPrefix = 'samocqa_';
  }

  const offerCodeFull1 = `${offerPrefix}win_${dateString}_${offerCode1}`;
  const offerCodeFullDuration1 = `${offerPrefix}win_${dateString}_${offerCode1}500_for_3mo`;
  const offerCodeFullDuration2 = `${offerPrefix}win_${dateString}_${offerCode1}500_for_3mo_v2`;
  const email = Cypress.env('VM_EMAIL');
  const apiWaitTimeout = { timeout: 120000 };

  const web_PO = new Web_PO();

  before(() => {
    cy.setLocalStorageClear();
    cy.customPostUserData();
    cy.saveLocalStorage();
  });

  beforeEach(() => {
    cy.viewport(1980, 1024);
  });

  it('should visit offers page', () => {
    web_PO.getOffers();
    cy.visit(offersUrl);
    web_PO.waitOffers(apiWaitTimeout);
    web_PO.waitForLoad('div', 'table-component-container-table', 'table');
  });

  it('should set headers', () => {
    web_PO.setHeaders(apiWaitTimeout);
  });

  it('should open offer create form', () => {
    web_PO.urlShouldContain('offers');
    web_PO.clickButton('ADD OFFER');
    web_PO.urlShouldContain('create');
    web_PO.waitForLoad(
      'div',
      'form-component-container-form-container',
      'form',
    );
  });

  it('should select "Winback" offerType', () => {
    cy.get('[formControlName="offerType"]').click();
    cy.get('[role="listbox"]').find('mat-option').contains('Winback').click();
  });

  it('should fill offerCode field', () => {
    web_PO.fillTextInput('offerCode', offerCode1, offerCodeFull1);
  });

  it('should select "twlght3month" plan', () => {
    cy.get('[formControlName="plan"]').click();
    cy.get('[role="listbox"]')
      .find('mat-option')
      .contains('twlght3month')
      .click();
  });

  it('should select "Fixed Amount" discountType', () => {
    cy.get('[formControlName="discountType"]').click();
    cy.get('[role="listbox"]')
      .find('mat-option')
      .contains('Fixed Amount')
      .click();
  });

  it('should fill discountAmount field', () => {
    cy.get('[formControlName="discountAmount"]').focus();
    web_PO.fillTextInput('discountAmount', '5', '5');
    cy.get('[formControlName="discountAmount"]').blur();

    cy.waitUntil(() =>
      cy
        .get('[formControlName="offerCode"]')
        .should('have.value', offerCodeFull1),
    );
    cy.waitUntil(() =>
      cy.get('[formControlName="offerCode"]').should('have.class', 'ng-valid'),
    );
    cy.waitUntil(() =>
      cy
        .get('[formControlName="offerCode"]')
        .should('have.attr', 'aria-invalid')
        .should('eq', 'false'),
    );
  });

  it('should select "3 Months" discountDurationType', () => {
    cy.get('[formControlName="discountDurationType"]').focus();
    cy.get('[formControlName="discountDurationType"]').click();
    cy.get('[role="listbox"]').find('mat-option').contains('3 Months').click();
    cy.get('[formControlName="discountDurationType"]').blur();

    cy.waitUntil(() =>
      cy
        .get('[formControlName="offerCode"]')
        .should('have.value', offerCodeFullDuration1),
    );
    cy.waitUntil(() =>
      cy.get('[formControlName="offerCode"]').should('have.class', 'ng-valid'),
    );
    cy.waitUntil(() =>
      cy
        .get('[formControlName="offerCode"]')
        .should('have.attr', 'aria-invalid')
        .should('eq', 'false'),
    );
  });

  it('should fill offerName field', () => {
    web_PO.fillTextInput('offerName', offerCodeFullDuration1);
  });

  it('should fill offerHeader field', () => {
    web_PO.fillTextInput('offerHeader', offerCodeFullDuration1);
  });

  it('should fill offerBodyText textarea', () => {
    web_PO.fillTextInput('offerBodyText', offerCodeFullDuration1);
  });

  it('should autofill offerAppliedBannerText field', () => {
    cy.wait(1000);
    cy.waitUntil(() =>
      cy
        .get('[formControlName="offerAppliedBannerText"]')
        .should(
          'have.value',
          '$5.00 FOR 3 MONTHS PROMO APPLIED, ($23.99/3 months after promo period)',
        ),
    );
  });

  it('should fill offerBgImageUrl field', () => {
    cy.get('[formControlName="offerBgImageUrl"]')
      .invoke('val', imageUrl)
      .trigger('change')
      .type(' ')
      .type('{backspace}') // =)
      .should('have.value', imageUrl);

    cy.get('.dnd-preview')
      .should('have.attr', 'src')
      .should('include', 'assets/Placeholder.png');
  });

  it('should autofill legalDisclaimer textarea', () => {
    cy.wait(1000);
    cy.waitUntil(() =>
      cy
        .get('[formControlName="legalDisclaimer"]')
        .should(
          'have.value',
          'Limited time offer. Offer available to new and previous twlght App subscribers who subscribe or re-subscribe via twlght.com.\nOffer does not include free trial.\nAfter completion of 3 month offer, service automatically renews for additional 3 month terms at $23.99 per 3 month term unless cancelled.\nSubscription fee is non-refundable.',
        ),
    );
  });

  it('should fill welcomeText textarea', () => {
    web_PO.fillTextInput('welcomeText', offerCodeFullDuration1);
  });

  it('should check filled offerBusinessOwner field', () => {
    cy.get('[formControlName="offerBusinessOwner"]').should(
      'have.value',
      email,
    );
  });

  it('should check noEndDate checkbox', () => {
    cy.get('[formControlName="noEndDate"]')
      .click()
      .should('have.class', 'mat-checkbox-checked');
  });

  it('should save offer to draft', () => {
    cy.waitUntil(() =>
      cy.get('button').contains('SAVE').should('not.be.disabled'),
    );
    cy.get('button').contains('SAVE').click({ force: true });
    web_PO.waitForDialogContent('Do you wish to proceed with SAVE ?');
    web_PO.clickButton('OK');
    web_PO.waitForDialogContent(
      `Offer (${offerCodeFullDuration1}) saved as draft successfully`,
    );
    web_PO.clickButton('OK');
  });

  it('should check offer detail page url', () => {
    web_PO.urlShouldContain('offers/detail/' + offerCodeFullDuration1);
  });

  it('should check saved offer in offers table', () => {
    web_PO.getOffers();
    cy.get('.header-component-container').contains('samoc').click();
    web_PO.waitOffers(apiWaitTimeout);
    web_PO.waitForLoad('div', 'table-component-container-table', 'table');
    cy.contains('td', offerCodeFullDuration1)
      .parent()
      .find('.mat-menu-trigger')
      .click();
    cy.contains('.mat-menu-item', 'View').click();
  });

  it('should check edit offer disabled fields', () => {
    web_PO.waitForLoad('div', 'details-component-container-header', 'div');
    web_PO.clickButton('EDIT');
    web_PO.urlShouldContain('offers/update/' + offerCodeFullDuration1);
    web_PO.waitForLoad(
      'div',
      'form-component-container-form-container',
      'form',
    );
    cy.get('[formControlName="offerType"]').should('not.be.empty');
    cy.get('[formControlName="offerType"]')
      .should('have.attr', 'aria-disabled')
      .should('eq', 'true');
    cy.get('[formControlName="offerCode"]').should('be.disabled');
    cy.get('[formControlName="plan"]').should('not.be.empty');
    cy.get('[formControlName="plan"]')
      .should('have.attr', 'aria-disabled')
      .should('eq', 'true');
    cy.get('[formControlName="eligiblePlans"]').should('not.exist');
    cy.get('[formControlName="offerCodeType"]').should('not.be.empty');
    cy.get('[formControlName="offerCodeType"]').should('not.be.disabled');
    cy.get('[formControlName="discountType"]').should('not.be.empty');
    cy.get('[formControlName="discountType"]').should('not.be.disabled');
    cy.get('[formControlName="offerName"]').should('not.be.disabled');
    cy.get('[formControlName="offerHeader"]').should('not.be.disabled');
    cy.get('[formControlName="offerBodyText"]').should('not.be.disabled');
    cy.get('[formControlName="offerBoldedText"]').should('not.be.disabled');
    cy.get('[formControlName="offerAppliedBannerText"]').should(
      'not.be.disabled',
    );
    cy.get('[formControlName="offerBgImageUrl"]').should('not.be.disabled');
    cy.get('[formControlName="legalDisclaimer"]').should('not.be.disabled');
    cy.get('[formControlName="welcomeText"]').should('not.be.disabled');
    cy.get('[formControlName="offerBusinessOwner"]').should('not.be.disabled');
    cy.get('[formControlName="noEndDate"]').should(
      'have.class',
      'mat-checkbox-checked',
    );
    cy.get('[formControlName="endDate"]').should('not.exist');

    cy.get('button').contains('UPDATE').should('have.class', 'button-disabled');
    cy.get('button').contains('UPDATE').should('be.disabled');
  });

  it('should update offer', () => {
    cy.get('[formControlName="discountAmount"]')
      .clear()
      .type('1')
      .should('have.value', '1');

    cy.get('button')
      .contains('UPDATE')
      .should('not.have.class', 'button-disabled');
    cy.get('button').contains('UPDATE').should('not.be.disabled');
    cy.get('button').contains('UPDATE').click({ force: true });
    web_PO.waitForDialogContent(`Do you wish to proceed with UPDATE ?`);
    web_PO.clickButton('OK');
    web_PO.waitForDialogContent(
      `Offer (${offerCodeFullDuration1}) updated successfully`,
    );
    web_PO.clickButton('OK');
  });

  it('should check duplicate offer fields', () => {
    web_PO.waitForLoad('div', 'details-component-container-header', 'div');
    web_PO.clickButton('DUPLICATE');
    web_PO.waitForDialogContent(`Do you wish to proceed with DUPLICATE?`);
    web_PO.clickButton('OK');
    web_PO.urlShouldContain('offers/create?prefill=' + offerCodeFullDuration1);
    web_PO.waitForLoad(
      'div',
      'form-component-container-form-container',
      'form',
    );

    cy.get('[formControlName="offerType"]').should('not.be.empty');
    cy.get('[formControlName="offerType"]')
      .should('have.attr', 'aria-disabled')
      .should('eq', 'false');

    cy.get('[formControlName="plan"]').should('not.be.empty');
    cy.get('[formControlName="plan"]')
      .should('have.attr', 'aria-disabled')
      .should('eq', 'false');
    cy.get('[formControlName="eligiblePlans"]').should('not.exist');
    cy.get('[formControlName="offerCodeType"]').should('not.be.empty');
    cy.get('[formControlName="offerCodeType"]').should('not.be.disabled');
    cy.get('[formControlName="discountType"]').should('not.be.empty');
    cy.get('[formControlName="discountType"]').should('not.be.disabled');
    cy.get('[formControlName="offerName"]').should('not.be.disabled');
    cy.get('[formControlName="offerHeader"]').should('not.be.disabled');
    cy.get('[formControlName="offerBodyText"]').should('not.be.disabled');
    cy.get('[formControlName="offerBoldedText"]').should('not.be.disabled');
    cy.get('[formControlName="offerAppliedBannerText"]').should(
      'not.be.disabled',
    );
    cy.get('[formControlName="offerBgImageUrl"]').should('not.be.disabled');
    cy.get('[formControlName="legalDisclaimer"]').should('not.be.disabled');
    cy.get('[formControlName="welcomeText"]').should('not.be.disabled');
    cy.get('[formControlName="offerBusinessOwner"]').should('not.be.disabled');
    cy.get('[formControlName="noEndDate"]').should(
      'have.class',
      'mat-checkbox-checked',
    );
    cy.get('[formControlName="endDate"]').should('not.exist');

    cy.get('button').contains('SAVE').should('have.class', 'button-disabled');
    cy.get('button').contains('CREATE').should('be.disabled');
  });

  it('should duplicate offer', () => {
    cy.waitUntil(() =>
      cy.get('[formControlName="offerCode"]').should('not.be.disabled'),
    );
    cy.waitUntil(() =>
      cy.get('[formControlName="offerCode"]').should('have.class', 'ng-valid'),
    );
    cy.waitUntil(() =>
      cy
        .get('[formControlName="offerCode"]')
        .should('have.attr', 'aria-invalid')
        .should('eq', 'false'),
    );
    cy.waitUntil(() =>
      cy
        .get('[formControlName="offerCode"]')
        .should('have.value', offerCodeFullDuration2),
    );

    cy.get('button')
      .contains('SAVE')
      .should('not.have.class', 'button-disabled');
    cy.get('button').contains('SAVE').should('not.be.disabled');
    cy.get('button').contains('SAVE').click({ force: true });
    web_PO.waitForDialogContent(`Do you wish to proceed with SAVE ?`);
    web_PO.clickButton('OK');
    web_PO.waitForDialogContent(
      `Offer (${offerCodeFullDuration2}) saved as draft successfully`,
    );
    web_PO.clickButton('OK');
  });

  it('should check duplicated offer detail page url', () => {
    web_PO.urlShouldContain('offers/detail/' + offerCodeFullDuration2);
  });

  it('should delete original offer', () => {
    cy.intercept('GET', `**${offerCodeFullDuration1}**`).as('offer');
    cy.visit(offersUrl + '/detail/' + offerCodeFullDuration1);
    cy.wait('@offer', { timeout: 30000 })
      .its('response.statusCode')
      .should('exist');
    web_PO.waitForLoad('div', 'details-component-container-header', 'div');
    web_PO.clickButton('DELETE');
    web_PO.waitForDialogContent(`Do you wish to proceed with DELETE?`);
    web_PO.clickButton('OK');
    web_PO.waitForDialogContent(
      `Offer (${offerCodeFullDuration1}) deleted successfully from DB`,
    );
    web_PO.clickButton('OK');
  });

  it('should check saved duplicated offer in offers table', () => {
    web_PO.getOffers();
    web_PO.waitOffers(apiWaitTimeout);
    web_PO.urlShouldContain('offers');
    web_PO.waitForLoad('div', 'table-component-container-table', 'table');
    cy.contains('td', offerCodeFullDuration2)
      .parent()
      .find('.mat-menu-trigger')
      .click();
    cy.contains('.mat-menu-item', 'View').click();
  });

  it('should delete duplicated offer', () => {
    web_PO.urlShouldContain('offers/detail/' + offerCodeFullDuration2);
    web_PO.waitForLoad('div', 'details-component-container-header', 'div');
    web_PO.clickButton('DELETE');
    web_PO.waitForDialogContent(`Do you wish to proceed with DELETE?`);
    web_PO.clickButton('OK');
    web_PO.getOffers();
    web_PO.waitForDialogContent(
      `Offer (${offerCodeFullDuration2}) deleted successfully from DB`,
    );
    web_PO.clickButton('OK');
    web_PO.waitOffers(apiWaitTimeout);
    web_PO.urlShouldContain('offers');
  });

  // it('should create offer from duplicated draft', () => {
  //   web_PO.urlShouldContain('offers/detail/' + offerCodeFullDuration2);
  //   web_PO.waitForLoad('div', 'details-component-container-header', 'div');
  //   cy.wait(2000)
  //   web_PO.clickButton('CREATE');
  //   web_PO.waitForDialogContent(`Do you wish to proceed with CREATE?`);
  //   web_PO.clickButton('OK');

  //   web_PO.waitForDialogContent(
  //     `Offer (${offerCodeFullDuration2}) created successfully on STG`,
  //   );
  //   web_PO.clickButton('OK');

  //   web_PO.waitForLoad('div', 'details-component-container-details', 'div');
  //   cy.wait(2000)
  //   cy.contains('p', 'OFFER STATUS')
  //     .siblings()
  //     .contains('Created on STG')
  //     .should('exist');
  //   cy.contains('p', 'OFFER PAGE')
  //     .siblings('a')
  //     .contains('Link')
  //     .should('have.attr', 'href');

  //   web_PO.urlShouldContain('offers/detail/' + offerCodeFullDuration2);
  // });

  // it('should check created offer in offers table', () => {
  //   web_PO.waitForLoad('div', 'details-component-container-details', 'div');
  //   cy.get('.header-component-container').contains('samoc').click();
  //   web_PO.waitForLoad('div', 'table-component-container-table', 'table');
  //   cy.contains('td', offerCodeFullDuration2)
  //     .siblings()
  //     .contains('STG')
  //     .click();
  // });

  // it('should retire created offer', () => {
  //   web_PO.urlShouldContain('offers/detail/' + offerCodeFullDuration2);
  //   web_PO.waitForLoad('div', 'details-component-container-header', 'div');
  //   web_PO.clickButton('RETIRE');
  //   web_PO.waitForDialogContent(`Do you wish to proceed with RETIRE?`);
  //   web_PO.clickButton('OK');

  //   web_PO.waitForDialogContent(
  //     `Offer (${offerCodeFullDuration2}) retired successfully on STG`,
  //   );
  //   web_PO.clickButton('OK');
  //   web_PO.urlShouldContain('offers/detail/' + offerCodeFullDuration2);
  //   web_PO.waitForLoad('div', 'details-component-container-details', 'div');
  //   cy.wait(2000)
  //   cy.contains('p', 'OFFER STATUS').siblings().contains('Retired on STG');
  // });

  // it('should check retired offer in offers table', () => {
  //   cy.get('.header-component-container').contains('samoc').click();
  //   cy.contains('td', offerCodeFullDuration2).siblings().contains('STG_RETD');
  // });

  after(() => {
    //Cleanup
  });
});
