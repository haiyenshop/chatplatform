import { validateAuthenticateRoutePermission } from './index';
import store from '../store'; // This import will be mocked
import { vi } from 'vitest';

// Mock the store module
vi.mock('../store', () => ({
  default: {
    getters: {
      isLoggedIn: false,
      getCurrentUser: {
        account_id: null,
        id: null,
        accounts: [],
      },
    },
  },
}));

describe('#validateAuthenticateRoutePermission', () => {
  let next;
  let originalLocation;
  let originalChatwootConfig;

  beforeEach(() => {
    next = vi.fn(); // Mock the next function
    originalLocation = window.location;
    originalChatwootConfig = window.chatwootConfig;
    window.chatwootConfig = {
      hostURL: 'https://chat.example.com',
      requestAccountStudioId: null,
      requestAccountId: null,
    };
  });

  describe('when user is not logged in', () => {
    it('should redirect to login', () => {
      const to = {
        name: 'some-protected-route',
        params: { accountId: 1 },
        fullPath: '/app/accounts/1/dashboard',
      };

      // Mock the store to simulate user not logged in
      store.getters.isLoggedIn = false;

      // Mock window.location.assign
      const mockAssign = vi.fn();
      delete window.location;
      window.location = { assign: mockAssign };

      validateAuthenticateRoutePermission(to, next);

      expect(mockAssign).toHaveBeenCalledWith(
        '/app/login?return_to=https%3A%2F%2Fchat.example.com%2Fapp%2Faccounts%2F1%2Fdashboard&account_id=1'
      );
    });

    it('should preserve studio_id when redirecting a direct access route to login', () => {
      const to = {
        name: 'conversation',
        params: { accountId: 21 },
        fullPath: '/app/accounts/21/conversations/89',
      };

      store.getters.isLoggedIn = false;
      window.chatwootConfig.requestAccountStudioId = 'studio-001';

      const mockAssign = vi.fn();
      delete window.location;
      window.location = { assign: mockAssign };

      validateAuthenticateRoutePermission(to, next);

      expect(mockAssign).toHaveBeenCalledWith(
        '/app/login?return_to=https%3A%2F%2Fchat.example.com%2Fapp%2Faccounts%2F21%2Fconversations%2F89&studio_id=studio-001&account_id=21'
      );
    });
  });

  describe('when user is logged in', () => {
    beforeEach(() => {
      // Mock the store's getter for a logged-in user
      store.getters.isLoggedIn = true;
      store.getters.getCurrentUser = {
        account_id: 1,
        id: 1,
        accounts: [
          {
            id: 1,
            role: 'agent',
            permissions: ['agent'],
            status: 'active',
          },
        ],
      };
    });

    describe('when route is not accessible to current user', () => {
      it('should redirect to dashboard', () => {
        const to = {
          name: 'general_settings_index',
          params: { accountId: 1 },
          meta: { permissions: ['administrator'] },
        };

        validateAuthenticateRoutePermission(to, next);

        expect(next).toHaveBeenCalledWith('/app/accounts/1/dashboard');
      });
    });

    describe('when route is accessible to current user', () => {
      beforeEach(() => {
        // Adjust store getters to reflect the user has admin permissions
        store.getters.getCurrentUser = {
          account_id: 1,
          id: 1,
          accounts: [
            {
              id: 1,
              role: 'administrator',
              permissions: ['administrator'],
              status: 'active',
            },
          ],
        };
      });

      it('should go to the intended route', () => {
        const to = {
          name: 'general_settings_index',
          params: { accountId: 1 },
          meta: { permissions: ['administrator'] },
        };

        validateAuthenticateRoutePermission(to, next);

        expect(next).toHaveBeenCalledWith();
      });
    });
  });

  afterEach(() => {
    window.location = originalLocation;
    window.chatwootConfig = originalChatwootConfig;
  });
});
