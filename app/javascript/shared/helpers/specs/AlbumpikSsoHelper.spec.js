import {
  buildAlbumpikLoginUrl,
  buildChatwootLoginPageUrl,
  isAlbumpikSsoEnabled,
  resolveAlbumpikStudioId,
  shouldAutoRedirectToAlbumpikLogin,
  shouldShowNativeLoginOptions,
} from '../AlbumpikSsoHelper';

describe('#AlbumpikSsoHelper', () => {
  it('detects when AlbumPik SSO is enabled', () => {
    expect(
      isAlbumpikSsoEnabled({
        albumpikSsoEnabled: 'true',
        albumpikLoginUrl: 'https://albumpik.example.com/login',
      })
    ).toBe(true);

    expect(
      isAlbumpikSsoEnabled({
        albumpikSsoEnabled: 'false',
        albumpikLoginUrl: 'https://albumpik.example.com/login',
      })
    ).toBe(false);

    expect(
      isAlbumpikSsoEnabled({
        albumpikSsoEnabled: 'true',
        albumpikLoginUrl: 'not-a-valid-url',
      })
    ).toBe(false);
  });

  it('respects rollout flags for native login and auto redirect', () => {
    expect(shouldShowNativeLoginOptions({ showLocalLoginForm: 'true' })).toBe(
      true
    );
    expect(shouldShowNativeLoginOptions({ showLocalLoginForm: 'false' })).toBe(
      false
    );

    expect(
      shouldAutoRedirectToAlbumpikLogin({
        albumpikSsoEnabled: 'true',
        albumpikLoginUrl: 'https://albumpik.example.com/login',
        autoRedirectToAlbumpikLogin: 'true',
      })
    ).toBe(true);
  });

  it('builds the AlbumPik login URL with return_to and studio_id', () => {
    expect(
      buildAlbumpikLoginUrl({
        chatwootConfig: {
          albumpikSsoEnabled: 'true',
          albumpikLoginUrl: 'https://albumpik.example.com/login',
          hostURL: 'https://chat.example.com',
          requestAccountStudioId: 'studio-001',
        },
        returnTo: 'https://chat.example.com/app/accounts/21/conversations/89',
      })
    ).toBe(
      'https://albumpik.example.com/login?service=chatplatform&return_to=https%3A%2F%2Fchat.example.com%2Fapp%2Faccounts%2F21%2Fconversations%2F89&studio_id=studio-001'
    );
  });

  it('builds a login page redirect URL that preserves direct access context', () => {
    expect(
      buildChatwootLoginPageUrl({
        to: {
          params: { accountId: 21 },
          fullPath: '/app/accounts/21/conversations/89',
        },
        chatwootConfig: {
          hostURL: 'https://chat.example.com',
          requestAccountStudioId: 'studio-001',
        },
      })
    ).toBe(
      '/app/login?return_to=https%3A%2F%2Fchat.example.com%2Fapp%2Faccounts%2F21%2Fconversations%2F89&studio_id=studio-001&account_id=21'
    );
  });

  it('prefers an explicit studio id over the request context', () => {
    expect(
      resolveAlbumpikStudioId({
        requestedStudioId: 'studio-explicit',
        requestAccountStudioId: 'studio-context',
      })
    ).toBe('studio-explicit');
  });
});
