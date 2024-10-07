/// <reference types="cypress-xpath" />

import 'cypress-localstorage-commands';
import 'cypress-real-events';
import { nth, upperCase } from 'cypress/types/lodash';
import { existsSync } from 'fs';

context('Cancellation offers edit, save and delete test', () => {
  //skipped until implementing offer creating and deleting
  const envUrl = Cypress.env('ENV_URL');
  const filterURl = envUrl + Cypress.env('FILTERS_URL'); 
  const email = Cypress.env('VM_EMAIL');
  const apiWaitTimeout = 150000;
  const waitForLoad = 5000
  const expectContentMessage = (text) => {
    cy.get('.mat-dialog-container').should('contain', text);
    cy.get('.button-dialog-primary').contains('OK').click();
  };
  const expectContainerMessage = (text) => {
    cy.get('.mat-dialog-container').should('contain', text);
    cy.get('.button-dialog-primary').contains('OK').click({force:true});
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
  const dragOfferFromTo = (numberInArrayFrom, numberInArrayTo) => {
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
    cy.wait(2000)
  };
  before(() => {
    cy.setLocalStorageClear();
    cy.customPostUserData();
    cy.saveLocalStorage();
  });
  beforeEach(() => {
    cy.viewport(1980, 1024);
  });
  it('Navigate to a Retention offer filter page', () => {
    cy.intercept('GET', '**/api/offers/retention/rules?store=twlght-web-us').as('rules');
    cy.visit(filterURl);
    cy.url().should('contain', filterURl);
    cy.wait('@rules', { timeout: apiWaitTimeout })
      .its('response.statusCode')
      .should('exist');
      cy.log(email)

  });

  it('Delete criterias to create a clean state', () => {
    cy.get('.mat-expansion-panel-header').should('exist');
    cy.get('.mat-expansion-panel-header')
      .find('.mat-icon')
      .each(($el) => {
      
        if ($el.text().match('delete_forever')) {
          cy.wait(waitForLoad)
          cy.wrap($el).contains('delete_forever').click({force:true});
          cy.wait(waitForLoad)
          expectContentMessage('Do you wish to DELETE');
        }
      });
      cy.wait(waitForLoad)
    cy.get('.mat-expansion-panel-header').contains('Default').should('exist');
    cy.get('.mat-expansion-panel-header').should('have.length', 1)
  });

  it('Add criteria and verify duplicate error', () => {
    cy.get('.mat-content').its('length').as('RuleBeforeAdd');
    cy.get('@RuleBeforeAdd').then((before) => {
      cy.get('[type="button"]').contains('ADD RULE').click();
      cy.get('.mat-content').its('length').as('RuleAfterAdd');
      cy.get('@RuleAfterAdd').then((after) => {
        const parsedBefore = parseInt(before.toString());
        const parsedAfter = parseInt(after.toString());
        expect(parsedBefore).to.be.lessThan(parsedAfter);
        expect(parsedBefore).to.be.eq(parsedAfter - 1);
      });
    });
    cy.get('.rule-have-error').should('have.length', 2);
    cy.get('.button-primary').contains('ADD RULE').should('be.disabled');
    cy.get('[role="alert"]').should(
      'contain',
      'Some rule duplicates another',
    );
  });
 
  it('Edit added Rule and validate list errors', () => {
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
        .contains('ADD RULE')
        .should('not.be.disabled');
      cy.get('.rule-have-error').should('not.exist');
      cy.get('[role="alert"]').should('not.exist');
      cy.get('.mat-expansion-panel-body')
        .eq($el.length - 2)
        .find('.right-column')
        .then(($el) => {
          cy.wrap($el)
            .find('.rule-primary-list')
            .then(($el) => {
              cy.wrap($el)
                .find('.button-primary')
                .contains('Add List')
                .click();
              cy.wrap($el)
                .find('[placeholder="Enter list name"]')
                .type('Primary');
            });
          cy.wrap($el)
            .find('.rule-primary-list').next()
          // .parentElement
          // .getElementByClassName
            .then(($el) => {
              cy.wrap($el)
                .find('[type="button"]')
                .contains('Add List')
                .click();
              cy.get('.list-placeholder').should(
                'contain',
                'Drag offers here',
              );
              cy.wrap($el)
                .find('.button-primary')
                .contains('Add List')
                .click();
              cy.get('[role="alert"]')
                .eq(0)
                .should('contain', 'Some rule is invalid ');
              cy.get('[role="alert"]')
                .eq(1)
                .should(
                  'contain',
                  'Lists weight values sum is greater than 100 ',
                );
              cy.wrap($el).find('.delete-list-button').eq(1).click();
              expectContainerMessage('Do you wish to REMOVE');
              cy.get('[role="alert"]').should('not.exist');
              cy.wrap($el)
                .find('.button-primary')
                .contains('Add List')
                .click();
              cy.get('[role="alert"]')
                .eq(0)
                .should('contain', 'Some rule is invalid ');
              cy.get('[role="alert"]')
                .eq(1)
                .should(
                  'contain',
                  'Lists weight values sum is greater than 100',
                );
              cy.get('[max="100"]').eq(0).clear().type('50');
              cy.get('[max="100"]').eq(1).clear().type('50');
              cy.get('[max="100"]').eq(2).clear().type('50');
              cy.wrap($el).find('.list-placeholder').should('have.length', 2);
              cy.wrap($el)
                .find('[placeholder="Enter list name"]')
                .eq(0)
                .type('Primary 1');
              cy.wrap($el)
                .find('[placeholder="Enter list name"]')
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
            .as('firstOffer');
          dragOfferFromTo(0, 2);
          dragOfferFromTo(0, 1);
          dragOfferFromTo(0, 0);
          cy.wait(2000);
          cy.get('.selected-offer-element').each((el) => {
            cy.get('@firstOffer').then((txt) => {
              cy.wrap(el).should('contain', txt.toString());
            });
          });
        });
      cy.get('.mat-expansion-panel-header')
        .eq(0)
        .then(($el) => {
          cy.wrap($el)
            .find('.rule-name')
            .eq(0).should(
              'contain',
              'Cypress Criteria: 1mo (Free Trial); Active: Cypress Active; Inactive: Cypress Inactive',
             
            );
          cy.wrap($el)
            .find('.rule-description')
            cy.wait(3000)
            cy.get('.rule-description')
            .should(
              'contain',
              '1st: Primary: 1 offer; 2nd: Primary 1: 1 offer, Primary 2: 1 offer',
              
            );
        });
    });
    dragCriteriaFromTo(1, 0);
  });

  it('Validate rule has a legend block',() => { 
    cy.get('.mat-content').then(($el) => {
    cy.get('.mat-expansion-panel-body')
     .eq($el.length - 2)
     .find('.right-column')
     .then(($el) => {
       cy.wrap($el)
         .find('.rules-legend-container').should('exist')
     })
    })
  })

  it('Can save as a dft Retention offers', () => {
    cy.get('.mat-content').its('length').as('amountOfCriteriasBeforeSave');
    cy.get('.button-primary').contains('SAVE AS DFT').click();
    expectContainerMessage('Save changes as DFT?');
    // cy.intercept('PUT', '**/api/offers/retention/rules?publish=draft').as('draft');
    // cy.wait('@draft', {timeout: apiWaitTimeout});
    cy.wait(apiWaitTimeout)
    expectContainerMessage('Cancellation offers were successfully saved as DFT');
    cy.intercept('GET', '**/api/offers/retention/rules?store=twlght-web-us').as('loadedOffers');
    cy.wait('@loadedOffers', { timeout: apiWaitTimeout })
      .its('response.statusCode')
      .should('exist');
    cy.get('.status').should('contain', ' DFT');
    cy.get('.header').children().should('contain', 'Saved by ' + email, {matchCase: false});
    cy.get('.mat-content').should('exist');
    cy.get('@amountOfCriteriasBeforeSave').then((lengthBeforeSave) => {
      cy.get('.mat-content').its('length').should('eq', lengthBeforeSave);
    });
    cy.get('.mat-expansion-panel')
      .eq(0)
      .then(($el) => {
        cy.wrap($el)
          .find('.rule-name')
          .eq(0)
          .should(
            'have.text',
            'Cypress Criteria: 1mo (Free Trial); Active: Cypress Active; Inactive: Cypress Inactive',
          );
        cy.wrap($el)
          .find('.rule-description')
          .should(
            'contain',
             '1st: Primary: 1 offer; 2nd: Primary 1: 1 offer, Primary 2: 1 offer',
          );
      });
  });
  
  it('Can Delete dft Cancellation offers', () => {
    cy.get('.button-tertiary').contains('DELETE DFT').click();
    expectContentMessage('Delete DFT?');
    expectContentMessage('Cancellation offers DFT was deleted successfully');
    cy.intercept('GET', '**/api/offers/retention/rules?store=twlght-web-us').as('loadedOffers');
    cy.wait('@loadedOffers', { timeout: apiWaitTimeout })
    .its('response.statusCode')
    .should('exist');
  });

  
it('Verify synchronize criteria config functioality',()=> {
  cy.get('.mat-expansion-panel-header').eq(0).click();
  cy.get('.mat-content').then(($el) => {
    cy.get('.rule-form-field-container')
      .eq(0)
      .then(($el) => {
        cy.wrap($el).type('Cypress Criterion');
      });
    cy.get('.rule-form-field-container')
      .eq(1)
      .click()
      .then(() => {
        cy.get('[role="listbox"]')
          .find('.mat-option-text')
          .contains(' 1 mo ')
          .click();
      });
    })
  cy.get('[type="button"]').contains(' SAVE AS DFT ').click()
  expectContainerMessage('Save changes as DFT?')
  expectContainerMessage('Cancellation offers were successfully saved as DFT')
  cy.wait(waitForLoad)
   cy.get('.mat-expansion-panel-header').contains(
    'Cypress Criterion: 1mo; Inactive: redbox*',
  ).should('exist');
  cy.get('.mat-icon').contains('sync').click({force:true});
  expectContainerMessage('Do you wish to SYNCHRONIZE all criteria?')
  expectContainerMessage('GhostLocker configuration found')
  cy.wait(apiWaitTimeout)
  cy.get('.mat-expansion-panel')
  .eq(0)
  .then(($el) => {
    cy.wrap($el)
      .find('.rule-name')
      .eq(0)
      .should(
        'not.have.text',
        'Cypress Criterion: 1mo; Inactive: redbox*',
      );
})
});
})
