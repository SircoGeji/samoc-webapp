/// <reference types="cypress-xpath" />
import 'cypress-localstorage-commands';

context('Authorize in samoc', () => {
  const envUrl = Cypress.env('ENV_URL');
  const loginUrl = envUrl + Cypress.env('LOGIN_URL');
  const username = Cypress.env('VM_USERNAME');
  const password = Cypress.env('VM_PASSWORD');
  const inputDelay = { delay: 0 };

  const waitForLoad = (block, selector, element?) => {
    cy.waitUntil(() => {
      if (element) {
        return cy
          .xpath(`//${block}[@class="${selector}"]//${element}`)
          .should('exist');
      } else {
        return cy.xpath(`//${block}[@class="${selector}"]`).should('exist');
      }
    });
  };

  const waitForDialogContent = (text) => {
    cy.waitUntil(() => cy.get('mat-dialog-content').should('contain', text));
  };

  const clickButton = (text) => {
    cy.wait(1000);
    cy.waitUntil(() => cy.get('button').contains(text).click());
  };

  const fillTextInput = (element, value, expect?) => {
    cy.get(`[formControlName="${element}"]`)
      .clear()
      .type(value, inputDelay)
      .should('have.value', expect || value);
  };

  const urlShouldContain = (str) => {
    cy.waitUntil(() => cy.url().should('contain', str));
  };

  beforeEach(() => {
    cy.viewport(1980, 1024);
  });

  // it('should check filling username field with email', () => {
  //   cy.waitUntil(() => cy.visit(loginUrl));
  //   fillTextInput('username', `${username}@gmail.com`);
  //   fillTextInput('password', password);
  //   clickButton('LOG IN');

  //   waitForDialogContent(
  //     'Please enter your twlght domain username instead of email',
  //   );
  //   clickButton('OK');
  // });

  it('should check filling username field with invalid username', () => {
    cy.waitUntil(() => cy.visit(loginUrl));
    fillTextInput('username', 'username');
    fillTextInput('password', 'password');
    clickButton('LOG IN');

    waitForDialogContent('Unauthorized');
    clickButton('OK');
  });

  it('should authorize in samoc', () => {
    fillTextInput('username', username);
    fillTextInput('password', password);
    clickButton('LOG IN');

    urlShouldContain('offers');
    waitForLoad('div', 'table-component-container-table', 'table');
  });

  it('should logout from offers page', () => {
    clickButton('LOGOUT');
    urlShouldContain('login');
  });
});
