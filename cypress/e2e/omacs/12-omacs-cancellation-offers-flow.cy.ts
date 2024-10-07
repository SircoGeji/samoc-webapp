/// <reference types="cypress-xpath" />

import 'cypress-localstorage-commands';
import 'cypress-real-events';

context('Cancellation offers edit, save and delete test', () => {
  //skipped until implementing offer creating and deleting
  const envUrl = Cypress.env('ENV_URL');
  const filterURl = envUrl + Cypress.env('INT_FILTERS_URL');
  const email = Cypress.env('VM_EMAIL');
  const apiWaitTimeout = 120000;
  const expectContentMessage = (text) => {
    cy.get('.mat-dialog-container').should('contain', text);
    cy.get('.button-dialog-primary').contains('OK').click();
  };
  const expectContainerMessage = (text) => {
    cy.get('.mat-dialog-container').should('contain', text);
    cy.get('.button-dialog-primary').contains('OK').click();
  };
  const dragCriteriaFromTo = (numberInArrayFrom, numberInArrayTo) => {
    cy.get('.mat-expansion-panel')
      .eq(numberInArrayFrom)
      .find('.cdk-drag-handle')
      .realMouseDown();
    cy.get('.mat-expansion-panel')
      .eq(numberInArrayTo)
      .find('.cdk-drag-handle')
      .realMouseMove(100, 100, { position: 'center' });
    cy.get('.mat-expansion-panel')
      .eq(numberInArrayTo)
      .find('.cdk-drag-handle')
      .realTouch();
  };
  const dragCampaignFromTo = (numberInArrayFrom, numberInArrayTo) => {
    cy.get('.rule-offers-list')
      .eq(numberInArrayFrom)
      .find('#all-offers-list')
      .find('.all-offers-element ')
      .not('.cdk-drag-disabled')
      .find('.cdk-drag-handle')
      .eq(0)
      .realMouseDown();
    cy.get('.list-placeholder')
      .eq(numberInArrayTo)
      .realMouseMove(100, 100, { position: 'center' });
    cy.get('.list-placeholder').eq(numberInArrayTo).realTouch();
  };
  before(() => {
    cy.setLocalStorageClear();
    cy.customPostUserData();
    cy.saveLocalStorage();
  });
  beforeEach(() => {
    cy.viewport(1980, 1024);
  });
  it('Navigate to a Cancellation offers form', () => {
    cy.intercept('GET', '**/api/offers').as('loadedOffers');
    cy.visit(filterURl);
    cy.url().should('contain', filterURl);
    cy.wait('@loadedOffers', { timeout: apiWaitTimeout })
      .its('response.statusCode')
      .should('exist');
  });
  it('Select All regions or validate it is selected', () => {
    cy.get('.inter-filters-regions-filter-container')
      .find('.mat-select-value-text')
      .then(($el) => {
        if ($el.text().match(' ALL REGIONS ')) {
          cy.wrap($el).should('have.text', ' ALL REGIONS ');
        } else {
          cy.get('.inter-filters-regions-filter-container').click();
          cy.get('[role="listbox"]')
            .find('.mat-option-text')
            .contains('ALL REGIONS')
            .click();
          cy.get('.cdk-overlay-backdrop').click();
          cy.get('.inter-filters-regions-filter-container')
            .find('.mat-select-value-text')
            .should('have.text', ' ALL REGIONS ');
        }
      });
  });
  it('Delete criterias to create a clean state', () => {
    cy.get('.mat-expansion-panel-header').should('exist');
    cy.get('.mat-expansion-panel-header')
      .find('.mat-icon')
      .each(($el) => {
        if ($el.text().match('delete_forever')) {
          cy.wrap($el).contains('delete_forever').click();
          expectContentMessage('Do you wish to DELETE');
        }
      });
    cy.get('.mat-expansion-panel-header').should('not.exist');
  });
  it('Add criteria and verify duplicate error', () => {
    cy.get('[type="button"]').contains('ADD CRITERION').click();
    cy.get('.mat-content').its('length').as('CriteriaBeforeAdd');
    cy.get('@CriteriaBeforeAdd').then((before) => {
      cy.get('[type="button"]').contains('ADD CRITERION').click();
      cy.get('.mat-content').its('length').as('CriteriaAfterAdd');
      cy.get('@CriteriaAfterAdd').then((after) => {
        const parsedBefore = parseInt(before.toString());
        const parsedAfter = parseInt(after.toString());
        expect(parsedBefore).to.be.lessThan(parsedAfter);
        expect(parsedBefore).to.be.eq(parsedAfter - 1);
      });
    });
    cy.get('.rule-have-error').should('have.length', 2);
    cy.get('.button-primary').contains('ADD CRITERION').should('be.disabled');
    cy.get('[role="alert"]').should(
      'contain',
      'Some criterion duplicates another',
    );
  });
  it('Validate rule is empty error', () => {
    cy.get('.mat-content').then(($el) => {
      cy.get('.mat-expansion-panel-body')
        .eq($el.length - 2)
        .find('.rule-form-fields')
        .contains(' ALL REGIONS ')
        .click();
      cy.get('[role="listbox"]')
        .find('.mat-option-text')
        .contains('ALL REGIONS')
        .click();
      cy.get('.cdk-overlay-backdrop').click();
      cy.get('[role="alert"]').should('contain', 'Some criterion is empty ');
      cy.get('.rule-have-error').should('have.length', 1);
      cy.get('.button-primary').contains('ADD CRITERION').should('be.disabled');
      cy.get('.mat-expansion-panel-body')
        .eq($el.length - 2)
        .find('.rule-form-fields')
        .find('.inter-plan-adjustment-select-container')
        .eq(2)
        .click();
      cy.get('[role="listbox"]')
        .find('.mat-option-text')
        .contains(' USA ')
        .click();
      cy.get('.cdk-overlay-backdrop').eq(0).click({ force: true });
      cy.get('[role="alert"]').should('not.contain', 'Some criterion is empty');
    });
  });
  it('Edit added Criteria and validate list errors', () => {
    cy.get('.mat-content').then(($el) => {
      cy.get('.rule-form-fields')
        .eq($el.length - 2)
        .find('.rule-form-field-container')
        .eq(0)
        .then(($el) => {
          cy.wrap($el).find('[type="text"]').clear();
          cy.wrap($el).find('[type="text"]').type('Cypress Criteria');
        });
      cy.get('.rule-form-fields')
        .eq($el.length - 2)
        .find('.rule-form-field-container')
        .eq(1)
        .click()
        .then(() => {
          cy.get('[role="listbox"]')
            .find('.mat-option-text')
            .contains(' 1 mo ')
            .click();
        });
      cy.get('.rule-form-fields')
        .eq($el.length - 2)
        .find('.rule-form-field-container')
        .eq(2)
        .click()
        .then(() => {
          cy.get('[role="listbox"]')
            .find('.mat-option-text')
            .contains('Yes')
            .click();
        });
      cy.get('.rule-form-fields')
        .eq($el.length - 2)
        .find('.rule-form-field-container')
        .eq(3)
        .then(($el) => {
          cy.wrap($el).find('textarea').type('Cypress Active');
        });
      cy.get('.rule-form-fields')
        .eq($el.length - 2)
        .find('.rule-form-field-container')
        .eq(4)
        .then(($el) => {
          cy.wrap($el).find('textarea').type('Cypress Inactive');
        });
      cy.get('.button-primary')
        .contains('ADD CRITERION')
        .should('not.be.disabled');
      cy.get('.rule-have-error').should('not.exist');
      cy.get('[role="alert"]').should('not.exist');
      cy.get('.mat-expansion-panel-body')
        .eq($el.length - 2)
        .find('.right-column')
        .then(($el) => {
          cy.wrap($el)
            .find('.rule-secondary-list')
            .then(($el) => {
              cy.wrap($el)
                .find('.button-primary')
                .contains('Add Group')
                .click();
              cy.wrap($el)
                .find('[placeholder="ENTER GROUP NAME"]')
                .type('Secondary');
            });
          cy.wrap($el)
            .find('.rule-primary-list')
            .then(($el) => {
              cy.wrap($el)
                .find('.button-primary')
                .contains('ADD GROUP')
                .click();
              cy.get('.list-placeholder').should(
                'contain',
                'Drag campaigns here',
              );
              cy.wrap($el)
                .find('.button-primary')
                .contains('ADD GROUP')
                .click();
              cy.get('[role="alert"]')
                .eq(0)
                .should('contain', 'Some criterion is invalid ');
              cy.get('[role="alert"]')
                .eq(1)
                .should(
                  'contain',
                  'Group display probability sum is greater than 100 ',
                );
              cy.wrap($el).find('.delete-list-button').eq(1).click();
              expectContainerMessage('Do you wish to REMOVE');
              cy.get('[role="alert"]').should('not.exist');
              cy.wrap($el)
                .find('.button-primary')
                .contains('ADD GROUP')
                .click();
              cy.get('[role="alert"]')
                .eq(0)
                .should('contain', 'Some criterion is invalid ');
              cy.get('[role="alert"]')
                .eq(1)
                .should(
                  'contain',
                  'Group display probability sum is greater than 100 ',
                );
              cy.get('[max="100"]').eq(0).clear().type('50');
              cy.get('[max="100"]').eq(1).clear().type('50');
              cy.wrap($el).find('.list-placeholder').should('have.length', 2);
              cy.wrap($el)
                .find('[placeholder="ENTER GROUP NAME"]')
                .eq(0)
                .type('Primary 1');
              cy.wrap($el)
                .find('[placeholder="ENTER GROUP NAME"]')
                .eq(1)
                .type('Primary 2');
              cy.get('[role="alert"]').should('not.exist');
            });
          cy.get('.rule-offers-list')
            .eq(0)
            .find('#all-offers-list')
            .find('.all-offers-element ')
            .not('.cdk-drag-disabled')
            .find('.rule-offer-container')
            .eq(0)
            .invoke('text')
            .as('firstCampaign');
          dragCampaignFromTo(0, 2);
          dragCampaignFromTo(0, 1);
          dragCampaignFromTo(0, 0);
          cy.get('.selected-offer-element').each((el) => {
            cy.get('@firstCampaign').then((txt) => {
              cy.wrap(el).should('contain', txt.toString());
            });
          });
        });
      cy.get('.mat-expansion-panel')
        .eq(0)
        .then(($el) => {
          cy.wrap($el)
            .find('.rule-text')
            .eq(0)
            .should(
              'have.text',
              'Cypress Criteria: 1mo (Free Trial); Active: Cypress Active; Inactive: Cypress Inactive',
            );
          cy.wrap($el)
            .find('.rule-text')
            .eq(1)
            .should(
              'contain',
              '1st: Primary 1: 1 campaign, Primary 2: 1 campaign; 2nd: Secondary: 1 campaign ',
            );
        });
    });
    dragCriteriaFromTo(1, 0);
  });
  it('Can save as a dft Cancellation offers', () => {
    cy.get('.mat-content').its('length').as('amountOfCriteriasBeforeSave');
    cy.get('.button-primary').contains('SAVE AS DFT').click();
    expectContainerMessage('Save changes as DFT?');
    // cy.intercept('PUT', '**/api/offers/retention/rules?publish=draft').as('draft');
    // cy.wait('@draft', {timeout: apiWaitTimeout});
    cy.wait(apiWaitTimeout)
    expectContainerMessage('Cancellation offers were successfully saved as DFT');
    cy.intercept('GET', '**/api/offers').as('loadedOffers');
    cy.wait('@loadedOffers', { timeout: apiWaitTimeout })
      .its('response.statusCode')
      .should('exist');
    cy.get('.status').should('contain', ' DFT');
    cy.get('.header').should('contain', 'Saved by ' + email);
    cy.get('.mat-content').should('exist');
    cy.get('@amountOfCriteriasBeforeSave').then((lengthBeforeSave) => {
      cy.get('.mat-content').its('length').should('eq', lengthBeforeSave);
    });
    cy.get('.mat-expansion-panel')
      .eq(1)
      .then(($el) => {
        cy.wrap($el)
          .find('.rule-text')
          .eq(0)
          .should(
            'have.text',
            'Cypress Criteria: 1mo (Free Trial); Active: Cypress Active; Inactive: Cypress Inactive',
          );
        cy.wrap($el)
          .find('.rule-text')
          .eq(1)
          .should(
            'contain',
            '1st: Primary 1: 1 campaign, Primary 2: 1 campaign; 2nd: Secondary: 1 campaign ',
          );
      });
  });
  it('Can Delete dft Cancellation offers', () => {
    cy.get('.button-tertiary').contains('DELETE DFT').click();
    expectContentMessage('Delete DFT?');
    expectContentMessage('Cancellation offers DFT was deleted successfully');
    cy.intercept('GET', '**/api/offers').as('loadedOffers');
    cy.wait('@loadedOffers', { timeout: apiWaitTimeout })
      .its('response.statusCode')
      .should('exist');
  });
});
