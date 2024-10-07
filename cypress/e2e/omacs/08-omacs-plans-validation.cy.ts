/// <reference types="cypress" />
import 'cypress-localstorage-commands';
import Web_PO from '../../support/pageObject/web/web_PO';

context('Plans form fields validation', () => {
  const envUrl = Cypress.env('ENV_URL');
  const offersUrl = envUrl + Cypress.env('OFFERS_URL');
  const invalidPlanCodeSymbols = 'planCode_123';
  const invalidPlanCode = 'plancode_123';
  const basePlanCode = 'twlght';
  let checkEnvironment = 'STG';
  const inputDelay = { delay: 0 };

  if (Cypress.env('ENV') !== 'PROD') {
    checkEnvironment = 'PROD';
  }

  let planCode = '';

  const createButtonDisabled = () => {
    cy.waitUntil(() =>
      cy.get('button').contains('CREATE').should('be.disabled'),
    );
  };

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

  it('Visit page and set headers', () => {
    web_PO.getOffers();
    cy.visit(offersUrl);
    web_PO.waitOffers(apiWaitTimeout);
    web_PO.setHeaders(apiWaitTimeout);
  });

  it('should check plans page', () => {
    web_PO.waitForLoad('div', 'table-component-container-table', 'table');
    cy.get('a').contains('PLANS').click();
    cy.get('.mat-paginator-page-size-select').click();
    cy.get('[role="listbox"]').find('mat-option').contains('50').click();
    cy.get('td').should('exist');
  });

  it('should check adding offer page from plans page', () => {
    cy.get('tbody')
      .first()
      .contains('td', 'PROD')
      .siblings('.mat-column-planCode')
      .children('div')
      .then(($div) => {
        planCode = $div.text();
      })
      .parent('td')
      .siblings('.mat-column-ellipsis')
      .children('.ng-star-inserted')
      .children('.mat-menu-trigger')
      .click();
    cy.get('.mat-menu-content').contains('RETIRE');
    cy.get('.mat-menu-content').contains('ADD OFFER').click();
    web_PO.urlShouldContain(`/create?planCode=${planCode}`);
    web_PO.waitForLoad(
      'div',
      'form-component-container-form-container',
      'form',
    );
    cy.waitUntil(() => cy.get('[formControlName="plan"]').contains(planCode));
    cy.waitUntil(() =>
      cy.get('[formControlName="plan"]').should('contain', planCode),
    );
  });

  it('should check samoc header click redirect', () => {
    cy.intercept('GET', '**/offers**').as('loadedOffers');
    cy.get('.header-component-container-heading').contains('samoc').click();
    cy.wait('@loadedOffers', apiWaitTimeout)
      .its('response.statusCode')
      .should('exist');
    cy.url().should('eq', offersUrl);
  });

  it('should check add plan field validation', () => {
    cy.intercept('GET', '**/api/plans**').as('loadedPlans');
    cy.waitUntil(() => cy.get('a').contains('PLANS').should('exist')).click();
    cy.wait('@loadedPlans', apiWaitTimeout)
      .its('response.statusCode')
      .should('exist');
    web_PO.urlShouldContain('plans');
    web_PO.clickButton('ADD PLAN');
    web_PO.urlShouldContain('plans/create');
    web_PO.waitForLoad(
      'div',
      'form-component-container-form-container',
      'form',
    );
    cy.get('[formControlName="planCode"]')
      .should('not.be.disabled')
      .focus()
      .blur()
      .should('have.class', 'ng-invalid');
    cy.get('mat-error').contains(`Please enter a plan code`);
    createButtonDisabled();

    web_PO.fillTextInput('planCode', invalidPlanCodeSymbols);
    cy.waitUntil(() =>
      cy.get('[formControlName="planCode"]').should('have.class', 'ng-invalid'),
    );
    cy.waitUntil(() =>
      cy
        .get('mat-error')
        .contains(`Valid characters are "a-z", "0-9", "+", "-" and "_"`),
    );
    createButtonDisabled();
    cy.get('[formcontrolname="planCode"]').clear().should('be.empty');

    web_PO.fillTextInput('planCode', invalidPlanCode);
    cy.waitUntil(() =>
      cy.get('[formControlName="planCode"]').should('have.class', 'ng-invalid'),
    );
    cy.waitUntil(() =>
      cy
        .get('mat-error')
        .contains(`Couldn't find Plan with code = ${invalidPlanCode}`),
    );
    createButtonDisabled();
    cy.get('[formcontrolname="planCode"]').clear().should('be.empty');

    web_PO.fillTextInput('planCode', basePlanCode);
    cy.waitUntil(() =>
      cy.get('[formControlName="planCode"]').should('have.class', 'ng-invalid'),
    );
    cy.waitUntil(() =>
      cy
        .get('mat-error')
        .contains(`Plan with code = ${basePlanCode} already exists in samoc.`),
    );
    createButtonDisabled();
    cy.get('[formcontrolname="planCode"]').clear().should('be.empty');
  });
});
