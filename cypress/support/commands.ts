import 'cypress-wait-until';
import 'cypress-localstorage-commands';
import 'cypress-xpath';
import 'cypress-file-upload';

declare global {
  namespace Cypress {
    interface Chainable {
      switchToIframe: typeof switchToIframe;
      switchToIframeByXPath: typeof switchToIframeByXPath;
      postUserData: typeof postUserData;
      customPostUserData: typeof customPostUserData;
      checkUser: typeof checkUser;
      setLocalStorageClear: typeof setLocalStorageClear;
      setViewPort: typeof setViewPort;
      generateRandomString: typeof generateRandomString;
    }
  }
}

export function switchToIframe(iframeSelector, ...elSelector) {
  return cy.get(`${iframeSelector || ''} > iframe`, { timeout: 10000 })
    .should(($iframe) => {
      for (let i = 0; i < elSelector.length; i++) {
        expect($iframe.contents().find(elSelector[i] || 'body')).to.exist;
      }
    })
    .then(($iframe) => {
      return cy.wrap($iframe.contents().find('body'));
    });
}

export function switchToIframeByXPath(iframeSelector, ...elSelector) {
  return cy
    .xpath(`${iframeSelector || ''}`, { timeout: 10000 })
    .should(($iframe) => {
      for (let i = 0; i < elSelector.length; i++) {
        expect($iframe.contents().find(elSelector[i] || 'body')).to.exist;
      }
    })
    .then(($iframe) => {
      return cy.wrap($iframe.contents().find('body'));
    });
}

export function postUserData() {
  return cy.request({
      method: 'POST',
      url: Cypress.env('ENV_SERVER_URL') + '/users/login',
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        username: Cypress.env('VM_USERNAME'),
        password: Cypress.env('VM_PASSWORD'),
      },
    })
    .its('body')
    .then((response) => {
      cy.setLocalStorage('jwt', response.data.token);
      cy.setLocalStorage('username', Cypress.env('VM_USERNAME'));
      cy.setLocalStorage('email', response.data.user.email);
    });
}

export function customPostUserData() {
  return cy.request({
      method: 'POST',
      url: Cypress.env('ENV_SERVER_URL') + '/users/login',
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        username: Cypress.env('VM_USERNAME'),
        password: Cypress.env('VM_PASSWORD'),
      },
    })
    .its('body')
    .then((response) => {
      cy.setLocalStorage('jwt', response.data.token);
      cy.setLocalStorage('username', Cypress.env('VM_USERNAME'));
      cy.setLocalStorage('email', response.data.user.email);
    });
}

const parseJwt = (token: string) => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
    return null;
  }
};

export const checkUser = () => {
  const jwt = localStorage.getItem('jwt');
  if (jwt) {
    const parsed = parseJwt(jwt);
    if (parsed) {
      const now = new Date().getTime() / 1000;
      console.log(`CHECKED: JWT expires in ${parsed.exp - now} seconds`);
      if (parsed.exp > now + 10 * 60) {
        return parsed.email;
      }
    }
  }
  localStorage.clear();
  return '';
};

export const setLocalStorageClear = () => {
  Cypress.LocalStorage.clear = function () {
    return;
  };
};

Cypress.LocalStorage.clear = function () {
  return;
};

export const setViewPort = (w = 1980, h = 1024) => {
  cy.viewport(w, h);
};

export const generateRandomString = (length: number) => {
  const characters = 'abcdefghijklmnopqrstuvwxyz';
  let result = '';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

Cypress.Commands.add('postUserData', postUserData);
Cypress.Commands.add('customPostUserData', customPostUserData);
Cypress.Commands.add('switchToIframe', switchToIframe);
Cypress.Commands.add('switchToIframeByXPath', switchToIframe);
Cypress.Commands.add('checkUser', checkUser);
Cypress.Commands.add('setLocalStorageClear', setLocalStorageClear);
Cypress.Commands.add('setViewPort', setViewPort);
Cypress.Commands.add('generateRandomString', generateRandomString);
