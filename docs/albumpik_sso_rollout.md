# AlbumPik SSO Rollout for Chatwoot

This document covers the Chatwoot-side rollout for the AlbumPik integration and maps to implementation tasks `CW-01` to `CW-05`.

## Scope

- `CW-01`: create and provision a `PlatformApp`
- `CW-02`: confirm `Account <-> Studio` and `User <-> PlatformApp` mapping rules
- `CW-03`: add `Login with AlbumPik` to the Chatwoot login page
- `CW-04`: hide native Chatwoot login options using config flags
- `CW-05`: pass `studio_id` when direct access starts from a tenant-specific Chatwoot route

## Required Config

These values can be supplied via environment variables and will also appear in `InstallationConfig` / Super Admin after first load.

```env
ALBUMPIK_SSO_ENABLED=true
ALBUMPIK_LOGIN_URL=https://albumpik.example.com/login
SHOW_LOCAL_LOGIN_FORM=true
AUTO_REDIRECT_TO_ALBUMPIK_LOGIN=false
ALBUMPIK_STUDIO_ATTRIBUTE_KEY=albumpik_studio_id
ALBUMPIK_PLATFORM_APP_NAME=AlbumPik Platform App
```

Recommended rollout:

1. `ALBUMPIK_SSO_ENABLED=true`
2. Keep `SHOW_LOCAL_LOGIN_FORM=true` during initial rollout
3. After validation, set `SHOW_LOCAL_LOGIN_FORM=false`
4. Only enable `AUTO_REDIRECT_TO_ALBUMPIK_LOGIN=true` after the flow is stable

## Mapping Rules

### Account to Studio

- One AlbumPik `studio` maps to one Chatwoot `account`
- Store the AlbumPik studio id on the Chatwoot account custom attributes
- Default key: `albumpik_studio_id`

Example from Rails console:

```ruby
account = Account.find(21)
account.update!(
  custom_attributes: account.custom_attributes.merge(
    'albumpik_studio_id' => 'studio_123'
  )
)
```

### PlatformApp permissions

Platform API tokens can only access resources created by the same platform app, or resources explicitly granted to that platform app.

That means:

- new Chatwoot accounts/users created from AlbumPik through the same Platform API token are accessible immediately
- existing Chatwoot accounts/users created outside that PlatformApp must be granted manually through `PlatformAppPermissible`

## Provision the PlatformApp

### Option A: Super Admin UI

1. Open `Super Admin -> Platform Apps`
2. Create `AlbumPik Platform App`
3. Copy the access token

### Option B: Rake task

```bash
bundle exec rake albumpik:chatwoot:ensure_platform_app
```

To print the token to stdout:

```bash
PRINT_PLATFORM_APP_TOKEN=true \
ALBUMPIK_PLATFORM_APP_NAME="AlbumPik Platform App" \
bundle exec rake albumpik:chatwoot:ensure_platform_app
```

To grant existing accounts/users:

```bash
ALBUMPIK_PLATFORM_APP_ACCOUNT_IDS=21,22 \
ALBUMPIK_PLATFORM_APP_USER_IDS=15,16 \
bundle exec rake albumpik:chatwoot:ensure_platform_app
```

## Direct Access Behavior

When an unauthenticated user lands on a protected Chatwoot route such as:

- `/app/accounts/:account_id/dashboard`
- `/app/accounts/:account_id/conversations/:conversation_id`

Chatwoot now redirects to `/app/login` while preserving:

- `return_to`: the original Chatwoot URL
- `studio_id`: resolved from `Account.custom_attributes[ALBUMPIK_STUDIO_ATTRIBUTE_KEY]`
- `account_id`: the Chatwoot account id, useful for debugging

Then the Chatwoot login page builds:

```text
https://albumpik.example.com/login?service=chatplatform&studio_id=<studioId>&return_to=<encoded_chatwoot_url>
```

If `studio_id` is not available, AlbumPik can still continue the flow and ask the user to choose a studio.

## Test Checklist

### Login page

- Open `/app/login`
- Verify the `Login with AlbumPik` CTA is visible when `ALBUMPIK_SSO_ENABLED=true`
- Verify native Chatwoot login controls remain visible when `SHOW_LOCAL_LOGIN_FORM=true`
- Verify native Chatwoot login controls are hidden when `SHOW_LOCAL_LOGIN_FORM=false`

### Direct access

- Open `/app/accounts/<account_id>/dashboard` in an incognito window
- Confirm Chatwoot redirects to `/app/login` with `return_to`
- If the account has `albumpik_studio_id`, confirm `studio_id` is also present in the query string
- Click `Login with AlbumPik`
- Confirm the browser goes to AlbumPik login with `service=chatplatform`

### End-to-end

- Finish login in AlbumPik
- Confirm AlbumPik redirects back to Chatwoot SSO successfully
- Confirm `sso_account_id` returns the user to the correct Chatwoot account
- Confirm `sso_conversation_id` deep-links to the intended conversation when provided by AlbumPik

## Notes

- Do not expose the Platform API token in frontend code or application logs
- Prefer keeping the PlatformApp token in AlbumPik backend only
- The Chatwoot-side `studio_id` support is intentionally based on account custom attributes so the mapping remains explicit and debuggable
