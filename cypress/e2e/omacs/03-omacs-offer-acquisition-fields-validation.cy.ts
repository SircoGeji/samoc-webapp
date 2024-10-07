/// <reference types="cypress-xpath" />
import * as moment from 'moment';
import 'cypress-localstorage-commands';
import Web_PO from '../../support/pageObject/web/web_PO'

context('Check acquisition offer form fields validation', () => {
  const characters = 'abcdefghijklmnopqrstuvwxyz';
  const generateRandomString = (length: number) => {
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    return result;
  }

  const offerCode = generateRandomString(6);
  const dateString = moment().format('YYMMDD');

  let offerPrefix = '';
  if (Cypress.env('ENV') !== 'PROD') {
    offerPrefix = 'samocqa_';
  }

  const envUrl = Cypress.env('ENV_URL');
  const offersUrl = envUrl + Cypress.env('OFFERS_URL');
  const imageUrl = Cypress.env('STOCK_IMAGE_URL');
  const offerCodeFocus = `${offerPrefix}acq_${dateString}_`;
  const offerCodeFull = `${offerPrefix}acq_${dateString}_${offerCode}`;
  const offerCodeFullDuration = `${offerPrefix}acq_${dateString}_${offerCode}500_for_1mo`;
  const email = Cypress.env('VM_EMAIL');
  const inputDelay = { delay: 0 };
  const apiWaitTimeout = { timeout: 120000 };

  const fillTextInput = (element, value, expect?, invalid?) => {
    cy.get(`[formControlName="${element}"]`)
      .focus()
      .blur()
    cy.waitUntil(() => cy.get(`[formControlName="${element}"]`).should('have.class', 'ng-invalid'))
    cy.get(`[formControlName="${element}"]`)
      .type(value, inputDelay)
      .should('have.value', expect || value)
      .blur()
    cy.waitUntil(() => cy.get(`[formControlName="${element}"]`).should('have.class', `ng-${invalid || 'valid'}`))
  };

  const offerFormSubmitButtonsDisabled = (prefix) => {
    cy.waitUntil(() => cy.get('button').contains('SAVE').should(`${prefix}have.class`, 'button-disabled'));
    cy.waitUntil(() => cy.get('button').contains('SAVE').should(`${prefix}be.disabled`));
    cy.waitUntil(() => cy.get('button').contains('CREATE').should(`${prefix}have.class`, 'button-disabled'));
    cy.waitUntil(() => cy.get('button').contains('CREATE').should(`${prefix}be.disabled`));
  }
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
    web_PO.setHeaders(apiWaitTimeout)
  });

  it('should open offer create form', () => {
    web_PO.urlShouldContain('offers');
    web_PO.clickButton('ADD OFFER');
    web_PO.urlShouldContain('create');
    web_PO.waitForLoad('div', 'form-component-container-form-container', 'form');
  });

  // offerType field
  it('should check offerType field', () => {
    cy.get('[formControlName="offerType"]').click();
    cy.get('[role="listbox"]')
      .children()
      .should('have.length', 3)
      .then(() => {
        cy.get('[role="listbox"]').find('mat-option').contains('Winback');
        cy.get('[role="listbox"]').find('mat-option').contains('Retention');
        cy.get('[role="listbox"]')
          .find('mat-option')
          .contains('Acquisition')
          .click();
      });

    offerFormSubmitButtonsDisabled('');
  });

  it('should check emptiness of other form fields', () => {
    cy.get('[formControlName="offerCode"]').should('be.empty');
    cy.get('[formControlName="plan"]').should('have.class', 'mat-select-empty');
    cy.get('[formControlName="eligiblePlans"]').should('not.exist');
    cy.get('[formControlName="offerCodeType"]').should(
      'have.class',
      'mat-select-empty',
    );
    cy.get('[formControlName="discountType"]').should(
      'have.class',
      'mat-select-empty',
    );
    cy.get('[formControlName="offerName"]').should('be.empty');
    cy.get('[formControlName="offerHeader"]').should('be.empty');
    cy.get('[formControlName="offerBodyText"]').should('be.empty');
    cy.get('[formControlName="offerBoldedText"]').should('be.empty');
    cy.get('[formControlName="offerAppliedBannerText"]').should('be.empty');
    cy.get('[formControlName="offerBgImageUrl"]').should('be.empty');
    cy.get('[formControlName="legalDisclaimer"]').should('be.empty');
    cy.get('[formControlName="welcomeText"]').should('be.empty');
    cy.get('[formControlName="offerBusinessOwner"]').should(
      'have.value',
      email,
    );
    cy.get('[formControlName="endDate"]').should('be.empty');
    cy.get('[formControlName="noEndDate"]').should(
      'not.have.class',
      'mat-checkbox-checked',
    );

    offerFormSubmitButtonsDisabled('')
  });

  // offerCode field
  it('should check offerCode field validation', () => {
    cy.get('[formControlName="offerCode"]')
      .focus()
      .should('have.value', offerCodeFocus)

    cy.get('[formControlName="offerCode"]')
      .type(offerCode, inputDelay)
      .should('have.value', offerCodeFull)
      .blur()
    cy.waitUntil(() =>
      cy.get('[formControlName="offerCode"]')
        .should('have.class', 'ng-valid')
        .should('have.attr', 'aria-invalid')
        .and('eq', 'false')
    )

    offerFormSubmitButtonsDisabled('')
  });

  // plan field
  it('should check plan field validation', () => {
    cy.get('[formControlName="plan"]').click();
    cy.get('[role="listbox"]')
      .children()
      .should('exist')

    cy.get(
      '.cdk-overlay-backdrop.cdk-overlay-transparent-backdrop.cdk-overlay-backdrop-showing',
    ).click();
    cy.get('[formControlName="plan"]')
      .should('have.class', 'ng-invalid')
      .should('have.attr', 'aria-invalid')
      .and('eq', 'true');
    cy.get('[formControlName="plan"]').click();
    cy.get('[role="listbox"]').find('mat-option').contains('twlght').click();
    cy.get('[formControlName="plan"]')
      .should('have.class', 'ng-valid')
      .should('have.attr', 'aria-invalid')
      .and('eq', 'false');

    offerFormSubmitButtonsDisabled('')
  });

  // offerCodeType field
  it('should check offerCodeType field validation', () => {
    cy.get('[formControlName="offerCodeType"]').click();
    cy.get('[role="listbox"]')
      .children()
      .should('have.length', 2)
      .then(() => {
        cy.get('[role="listbox"]').find('mat-option').contains(' Single Code ');
        cy.get('[role="listbox"]')
          .find('mat-option')
          .contains(' Bulk Unique Codes ');
      });
    cy.get(
      '.cdk-overlay-backdrop.cdk-overlay-transparent-backdrop.cdk-overlay-backdrop-showing',
    ).click();
    cy.get('[formControlName="offerCodeType"]')
      .should('have.class', 'ng-invalid')
      .should('have.attr', 'aria-invalid')
      .and('eq', 'true');

    cy.get('[formControlName="offerCodeType"]').click();
    cy.get('[role="listbox"]')
      .find('mat-option')
      .contains('Single Code')
      .click();
    cy.get('[formControlName="offerCodeType"]')
      .should('have.class', 'ng-valid')
      .should('have.attr', 'aria-invalid')
      .and('eq', 'false');
    cy.get('[formControlName="totalUniqueCodes"]').should('not.exist');

    cy.get('[formControlName="offerCodeType"]').click();
    cy.get('[role="listbox"]')
      .find('mat-option')
      .contains('Bulk Unique Codes')
      .click();
    cy.get('[formControlName="totalUniqueCodes"]').should('exist');

    offerFormSubmitButtonsDisabled('')
  });

  // totalUniqueCodes field
  it('should check totalUniqueCodes field validation', () => {
    fillTextInput('totalUniqueCodes', '10')
    offerFormSubmitButtonsDisabled('')
  });

  // discountType field
  it('should check discountType field validation', () => {
    cy.get('[formControlName="discountType"]').click();
    cy.get('[role="listbox"]')
      .children()
      .should('have.length', 2)
      .then(() => {
        cy.get('[role="listbox"]')
          .find('mat-option')
          .contains(' Fixed Amount ');
        cy.get('[role="listbox"]').find('mat-option').contains(' Free Trial ');
      });
    cy.get(
      '.cdk-overlay-backdrop.cdk-overlay-transparent-backdrop.cdk-overlay-backdrop-showing',
    ).click();
    cy.get('[formControlName="discountType"]')
      .should('have.class', 'ng-invalid')
      .should('have.attr', 'aria-invalid')
      .and('eq', 'true');

    cy.get('[formControlName="discountType"]').click();
    cy.get('[role="listbox"]')
      .find('mat-option')
      .contains('Fixed Amount')
      .click();
    cy.get('[formControlName="discountType"]')
      .should('have.class', 'ng-valid')
      .should('have.attr', 'aria-invalid')
      .and('eq', 'false');
    cy.get('[formControlName="discountAmount"]').should('exist');
    cy.get('[formControlName="discountDurationType"]').should('exist');

    offerFormSubmitButtonsDisabled('')
  });

  // discountAmount field
  it('should check discountAmount field validation', () => {
    fillTextInput('discountAmount', '500', '500', 'invalid')

    cy.get('[formControlName="discountAmount"]')
      .clear()
    fillTextInput('discountAmount', '5')
    offerFormSubmitButtonsDisabled('')

    cy.waitUntil(() =>
      cy.get('[formControlName="offerCode"]')
        .should('have.value', offerCodeFull)
        .should('have.class', 'ng-valid')
        .should('have.attr', 'aria-invalid')
        .and('eq', 'false')
    )
  });

  // discountDurationType field
  it('should check discountDurationType field validation', () => {
    cy.get('[formControlName="discountDurationType"]').click();
    cy.get('[role="listbox"]')
      .children()
      .should('exist')

    cy.get(
      '.cdk-overlay-backdrop.cdk-overlay-transparent-backdrop.cdk-overlay-backdrop-showing',
    ).click();
    cy.get('[formControlName="discountDurationType"]')
      .should('have.class', 'ng-invalid')
      .should('have.attr', 'aria-invalid')
      .and('eq', 'true');

    cy.get('[formControlName="discountDurationType"]')
      .click()
      .get('[role="listbox"]')
      .find('mat-option')
      .contains(' 1 Month ')
      .click();

    offerFormSubmitButtonsDisabled('')

    cy.waitUntil(() =>
      cy.get('[formControlName="offerCode"]')
        .should('have.value', offerCodeFullDuration)
        .should('have.class', 'ng-valid')
        .should('have.attr', 'aria-invalid')
        .and('eq', 'false')
    )
  });

  // offerName field
  it('should check offerName field validation', () => {
    fillTextInput('offerName', offerCodeFullDuration)

    offerFormSubmitButtonsDisabled('')
  });

  // offerHeader field
  it('should check offerHeader field validation', () => {
    cy.get('[formControlName="offerHeader"]')
      .focus()
      .blur()
      .should('have.class', 'ng-invalid');

    // rs-RS
    cy.get('[formControlName="offerHeader"]')
      .type("Не желая вставать со всеми остальными в строй - он даже не встал с кровати.", inputDelay)
      .should('have.class', 'ng-invalid')
      .then(() => {
        cy.get('mat-error').should('exist')
      })
    cy.get('[formControlName="offerHeader"]')
      .clear()
      .then(() => {
        cy.get('mat-error')
          .contains("Please enter an offer header ")
      })

    // special symbols
    cy.get('[formControlName="offerHeader"]')
      .type("!@#$%&().,?:/<>\"'=+-_;", inputDelay)
      .should('have.class', 'ng-valid')
      .should('have.attr', 'aria-invalid')
      .and('eq', 'false')
      .then(() => {
        cy.get('mat-error').should('not.exist')
      })
    cy.get('[formControlName="offerHeader"]')
      .clear();

    //   // fr-FR
    //   cy.get('[formControlName="offerHeader"]')
    //     .type("Après l'essai gratuit de 7 jours, votre abonnement se renouvèlera automatiquement via Google Play en fonction du forfait choisi.", { delay: inputDelay })
    //     .should('have.class', 'ng-valid')
    //     .should('have.attr', 'aria-invalid')
    //     .and('eq', 'false')
    //     .then(() => {
    //       cy.get('mat-error').should('not.exist')
    //     })
    //     cy.get('[formControlName="offerHeader"]')
    //     .clear();

    //   // es-ES
    //   cy.get('[formControlName="offerHeader"]')
    //     .type("Después de tu prueba gratuita de 7 días, la suscripción se renovará automáticamente según tu plan de suscripción a través de Google Play.", { delay: inputDelay })
    //     .should('have.class', 'ng-valid')
    //     .should('have.attr', 'aria-invalid')
    //     .and('eq', 'false')
    //     .then(() => {
    //       cy.get('mat-error').should('not.exist')
    //     })
    //     cy.get('[formControlName="offerHeader"]')
    //     .clear();

    //   // de-DE
    //   cy.get('[formControlName="offerHeader"]')
    //     .type("Nach Ablauf Ihrer 14-tägigen kostenlosen Probezeit verlängert sich Ihr Abonnement entsprechend Ihrem Abonnement-Plan automatisch über Google Play.", { delay: inputDelay })
    //     .should('have.class', 'ng-valid')
    //     .should('have.attr', 'aria-invalid')
    //     .and('eq', 'false')
    //     .then(() => {
    //       cy.get('mat-error').should('not.exist')
    //     })
    //     cy.get('[formControlName="offerHeader"]')
    //     .clear();

    //   // es-419
    //   cy.get('[formControlName="offerHeader"]')
    //     .type("Después de tu prueba gratuita de 7 días, la suscripción se renovará automáticamente según tu plan de suscripción a través de Google Play.", { delay: inputDelay })
    //     .should('have.class', 'ng-valid')
    //     .should('have.attr', 'aria-invalid')
    //     .and('eq', 'false')
    //     .then(() => {
    //       cy.get('mat-error').should('not.exist')
    //     })
    //     cy.get('[formControlName="offerHeader"]')
    //     .clear();

    //   // it-IT
    //   cy.get('[formControlName="offerHeader"]')
    //     .type("Al termine della prova gratuita di 7 giorni, l’abbonamento si rinnoverà automaticamente in base al tuo piano tramite Google Play.", { delay: inputDelay })
    //     .should('have.class', 'ng-valid')
    //     .should('have.attr', 'aria-invalid')
    //     .and('eq', 'false')
    //     .then(() => {
    //       cy.get('mat-error').should('not.exist')
    //     })
    //     cy.get('[formControlName="offerHeader"]')
    //     .clear();

    //   // pt-BR
    //   cy.get('[formControlName="offerHeader"]')
    //     .type("Após sua avaliação gratuita de 7 dias, a assinatura se renovará automaticamente pelo Google Play, com base em seu plano de assinatura.", { delay: inputDelay })
    //     .should('have.class', 'ng-valid')
    //     .should('have.attr', 'aria-invalid')
    //     .and('eq', 'false')
    //     .then(() => {
    //       cy.get('mat-error').should('not.exist')
    //     })
    //     cy.get('[formControlName="offerHeader"]')
    //     .clear();

    //   // nl-NL
    //   cy.get('[formControlName="offerHeader"]')
    //     .type("Na je gratis proefperiode van 7 dagen wordt het abonnement automatisch via Google Play verlengd op basis van je abonnementstype.", { delay: inputDelay })
    //     .should('have.class', 'ng-valid')
    //     .should('have.attr', 'aria-invalid')
    //     .and('eq', 'false')
    //     .then(() => {
    //       cy.get('mat-error').should('not.exist')
    //     })
    //     cy.get('[formControlName="offerHeader"]')
    //     .clear();

    cy.get('[formControlName="offerHeader"]')
      .type(offerCodeFullDuration, inputDelay)
      .should('have.value', offerCodeFullDuration)
      .blur()
      .should('have.class', 'ng-valid')
      .should('have.attr', 'aria-invalid')
      .and('eq', 'false')
      .then(() => {
        cy.get('mat-error').should('not.exist')
      })

    offerFormSubmitButtonsDisabled('')
  });

  // offerBodyText field
  it('should check offerBodyText field validation', () => {
    fillTextInput('offerBodyText', offerCodeFullDuration)

    offerFormSubmitButtonsDisabled('')
  });

  // offerAppliedBannerText field
  it('should autofill offerAppliedBannerText field', () => {
    cy.wait(1000);
    cy.waitUntil(() =>
      cy.get('[formControlName="offerAppliedBannerText"]')
        .should('have.value', '$5.00/MONTH PROMO APPLIED, ($8.99/month after promo period)')
    );

    offerFormSubmitButtonsDisabled('')
  });

  // offerBgImageUrl field
  it('should check offerBgImageUrl field validation', () => {
    cy.get('[formControlName="offerBgImageUrl"]')
      .focus()
      .blur()
      .should('have.class', 'ng-invalid');

    cy.get('[formControlName="offerBgImageUrl"]')
      .invoke('val', offerCodeFullDuration)
      .trigger('change')
      .type(' ')
      .type('{backspace}') // =)
      .should('have.value', offerCodeFullDuration)
      .blur()
      .should('have.class', 'ng-invalid')
      .should('have.attr', 'aria-invalid')
      .and('eq', 'true');

    cy.get('.dnd-preview')
      .should('have.attr', 'src')
      .should('include', 'assets/Placeholder.png');

    cy.get('[formControlName="offerBgImageUrl"]')
      .clear()
      .invoke('val', imageUrl)
      .trigger('change')
      .type(' ')
      .type('{backspace}') // =)
      .should('have.value', imageUrl)
      .blur()
      .should('have.class', 'ng-valid')
      .should('have.attr', 'aria-invalid')
      .and('eq', 'false');
    cy.get('.dnd-preview')
      .should('have.attr', 'src')
      .should('include', imageUrl);

    offerFormSubmitButtonsDisabled('')
  });

  // legalDisclaimer field
  it('should autofill legalDisclaimer field', () => {
    cy.wait(1000);
    cy.waitUntil(() =>
      cy.get('[formControlName="legalDisclaimer"]')
        .should('have.value', 'Limited time offer. Offer available to new and previous twlght App subscribers who subscribe or re-subscribe via twlght.com.\nOffer does not include free trial.\nAfter completion of 1 month offer, service automatically renews for additional 1 month terms at $8.99 per 1 month term unless cancelled.\nSubscription fee is non-refundable.')
    );

    offerFormSubmitButtonsDisabled('');
  });

  // welcomeText field
  it('should check welcomeText field validation', () => {
    fillTextInput('welcomeText', offerCodeFullDuration)

    offerFormSubmitButtonsDisabled('not.');
  });

  // offerBusinessOwner field
  it('should check offerBusinessOwner field validation', () => {
    cy.get('[formControlName="offerBusinessOwner"]')
      .clear()

    fillTextInput('offerBusinessOwner', email)

    offerFormSubmitButtonsDisabled('not.');
  });

  // endTime field
  it('should check endTime field validation', () => {
    cy.get('[formControlName="endTime"]').should(
      'have.class',
      'disabled-field',
    );
    cy.get('[formControlName="endTime"]').should('be.disabled');
  });

  // noEndDate checkbox
  it('should check noEndDate checkbox validation', () => {
    cy.get('[formControlName="noEndDate"]')
      .click()
      .should('have.class', 'mat-checkbox-checked');
    cy.get('[formControlName="endDate"]').should('not.exist');
    cy.get('[formControlName="endTime"]').should('not.exist');
  });

  // SAVE and CREATE buttons
  it('should check SAVE and CREATE buttons validation', () => {
    offerFormSubmitButtonsDisabled('not.');
    cy.get('button').contains('SAVE').click({ force: true });
    web_PO.waitForDialogContent('Do you wish to proceed with SAVE ?');
    cy.get('button').contains('OK').should('exist');
    cy.get('button').contains('CANCEL').click();
    cy.get('button').contains('CREATE').click({ force: true });
    web_PO.waitForDialogContent('Do you wish to proceed with CREATE ?');
    cy.get('button').contains('OK').should('exist');
    web_PO.clickButton('CANCEL');
  });

  it('should check back button validation', () => {
    web_PO.getOffers();
    cy.get('.backbtn').click();
    web_PO.waitForDialogContent('Go back without saving?');
    web_PO.clickButton('OK');
    web_PO.urlShouldContain('offers');
    web_PO.waitForLoad('div', 'table-component-container-table', 'table');
    web_PO.waitOffers(apiWaitTimeout);
  });

  after(() => {
    //Cleanup
  });
});
