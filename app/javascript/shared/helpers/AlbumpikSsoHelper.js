const parseBoolean = value => value === true || value === 'true';

const getWindowLocationOrigin = () => {
  if (typeof window === 'undefined' || !window.location?.origin) {
    return 'http://localhost';
  }

  return window.location.origin;
};

const buildUrl = (value, base = getWindowLocationOrigin()) => {
  if (!value) return null;

  try {
    return new URL(value, base);
  } catch (error) {
    return null;
  }
};

const isSupportedHttpUrl = url => {
  return ['http:', 'https:'].includes(url?.protocol);
};

const getAlbumpikLoginTarget = chatwootConfig => {
  const value = chatwootConfig?.albumpikLoginUrl;
  if (!value || typeof value !== 'string') return null;

  const trimmed = value.trim();
  // Require an absolute http(s) URL. Relative strings like "not-a-valid-url" would
  // otherwise resolve against the dashboard origin and incorrectly enable SSO.
  if (!/^https?:\/\//i.test(trimmed)) return null;

  try {
    const url = new URL(trimmed);
    return isSupportedHttpUrl(url) ? url : null;
  } catch {
    return null;
  }
};

const getDefaultReturnTo = hostURL => {
  const fallbackBase =
    buildUrl(hostURL) || buildUrl(`${getWindowLocationOrigin()}/app`);
  return fallbackBase ? new URL('/app', fallbackBase).toString() : '/app';
};

export const isAlbumpikSsoEnabled = (chatwootConfig = {}) => {
  return (
    parseBoolean(chatwootConfig.albumpikSsoEnabled) &&
    Boolean(getAlbumpikLoginTarget(chatwootConfig))
  );
};

export const shouldShowNativeLoginOptions = (chatwootConfig = {}) => {
  return parseBoolean(chatwootConfig.showLocalLoginForm);
};

export const shouldAutoRedirectToAlbumpikLogin = (chatwootConfig = {}) => {
  return (
    isAlbumpikSsoEnabled(chatwootConfig) &&
    parseBoolean(chatwootConfig.autoRedirectToAlbumpikLogin)
  );
};

export const resolveAlbumpikStudioId = ({
  requestedStudioId,
  requestAccountStudioId,
}) => {
  return requestedStudioId || requestAccountStudioId || '';
};

export const buildAlbumpikLoginUrl = ({
  chatwootConfig = {},
  returnTo,
  studioId,
} = {}) => {
  if (!isAlbumpikSsoEnabled(chatwootConfig)) return '';

  const url = getAlbumpikLoginTarget(chatwootConfig);
  if (!url) return '';

  url.searchParams.set('service', 'chatplatform');

  const resolvedReturnTo =
    returnTo || getDefaultReturnTo(chatwootConfig.hostURL);
  if (resolvedReturnTo) {
    url.searchParams.set('return_to', resolvedReturnTo);
  }

  const resolvedStudioId = resolveAlbumpikStudioId({
    requestedStudioId: studioId,
    requestAccountStudioId: chatwootConfig.requestAccountStudioId,
  });
  if (resolvedStudioId) {
    url.searchParams.set('studio_id', resolvedStudioId);
  }

  return url.toString();
};

export const buildChatwootLoginPageUrl = ({
  to = {},
  chatwootConfig = {},
} = {}) => {
  const params = new URLSearchParams();
  const requestedStudioId = resolveAlbumpikStudioId({
    requestedStudioId: to.query?.studio_id,
    requestAccountStudioId: chatwootConfig.requestAccountStudioId,
  });

  const returnTo = buildUrl(to.fullPath || to.path, chatwootConfig.hostURL);

  if (returnTo) {
    params.set('return_to', returnTo.toString());
  }

  if (requestedStudioId) {
    params.set('studio_id', requestedStudioId);
  }

  if (to.params?.accountId || chatwootConfig.requestAccountId) {
    params.set(
      'account_id',
      String(to.params?.accountId || chatwootConfig.requestAccountId)
    );
  }

  const queryString = params.toString();
  return queryString ? `/app/login?${queryString}` : '/app/login';
};
