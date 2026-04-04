# Phan tich login Chatwoot va kha nang tich hop voi he thong san co

## Ket luan nhanh

Co, hoan toan co the tich hop voi he thong san co ma khong dung form login mac dinh cua Chatwoot.

Cach kha thi nhat la:

1. He thong hien tai xac thuc user.
2. Backend cua he thong do goi Chatwoot de sinh `sso_auth_token` hoac lay SSO login link.
3. Redirect user sang Chatwoot voi URL dang `/app/login?email=...&sso_auth_token=...`.
4. Frontend Chatwoot tu dong dang nhap, khong can user nhap lai email/password.

Day la huong it sua core nhat va codebase nay da ho tro san.

## Login hien tai hoat dong the nao

### 1. Route auth chinh

Chatwoot mount auth bang `devise_token_auth`:

- [config/routes.rb](/Users/nguyenxuanhai/workspace/haiyen/chatwoot-4.12.1/config/routes.rb)

Doan quan trong:

```rb
mount_devise_token_auth_for 'User', at: 'auth', controllers: {
  confirmations: 'devise_overrides/confirmations',
  passwords: 'devise_overrides/passwords',
  sessions: 'devise_overrides/sessions',
  token_validations: 'devise_overrides/token_validations',
  omniauth_callbacks: 'devise_overrides/omniauth_callbacks'
}, via: [:get, :post]
```

Nghia la dashboard web login qua `/auth/sign_in`, validate session qua `/auth/validate_token`, password reset qua `/auth/password`, v.v.

### 2. User model

User dung dong thoi `Devise` va `DeviseTokenAuth`:

- [app/models/user.rb](/Users/nguyenxuanhai/workspace/haiyen/chatwoot-4.12.1/app/models/user.rb)

Nhung module auth chinh:

```rb
include DeviseTokenAuth::Concerns::User

devise :database_authenticatable,
       :registerable,
       :recoverable,
       :rememberable,
       :trackable,
       :validatable,
       :confirmable,
       :password_has_required_content,
       :two_factor_authenticatable,
       :omniauthable, omniauth_providers: [:google_oauth2, :saml]
```

Dieu nay cho thay:

- Co login bang email/password
- Co confirm email
- Co reset password
- Co MFA/2FA
- Co OAuth/SSO

### 3. Session controller thuc te

Luong login chinh nam o:

- [app/controllers/devise_overrides/sessions_controller.rb](/Users/nguyenxuanhai/workspace/haiyen/chatwoot-4.12.1/app/controllers/devise_overrides/sessions_controller.rb)

Controller nay ho tro 3 nhanh:

1. Login bang email/password
2. Login bang MFA token + OTP/backup code
3. Login bang `sso_auth_token`

Logic rut gon:

```rb
def create
  return handle_mfa_verification if mfa_verification_request?
  return handle_sso_authentication if sso_authentication_request?

  user = find_user_for_authentication
  return handle_mfa_required(user) if user&.mfa_enabled?

  super
end
```

### 4. Co san SSO token ngan han

Chatwoot da co co che SSO token rieng:

- [app/models/concerns/sso_authenticatable.rb](/Users/nguyenxuanhai/workspace/haiyen/chatwoot-4.12.1/app/models/concerns/sso_authenticatable.rb)

No lam cac viec sau:

- Tao token bang `SecureRandom.hex(32)`
- Luu vao Redis trong 5 phut
- Validate token
- Tao login link dang:

```rb
"#{FRONTEND_URL}/app/login?email=#{encoded_email}&sso_auth_token=#{generate_sso_auth_token}"
```

Day la diem rat quan trong: codebase da cho phep login khong qua form password truyen thong.

### 5. Frontend login page tu dong login neu co SSO token

File:

- [app/javascript/v3/views/login/Index.vue](/Users/nguyenxuanhai/workspace/haiyen/chatwoot-4.12.1/app/javascript/v3/views/login/Index.vue)

Trong `created()`:

```js
if (this.ssoAuthToken) {
  this.submitLogin();
}
```

Va khi submit:

```js
const credentials = {
  email: this.email ? decodeURIComponent(this.email) : this.credentials.email,
  password: this.credentials.password,
  sso_auth_token: this.ssoAuthToken,
  ssoAccountId: this.ssoAccountId,
  ssoConversationId: this.ssoConversationId,
};
```

Nghia la neu URL co:

```text
/app/login?email=user@example.com&sso_auth_token=xxxxx
```

thi frontend tu goi `/auth/sign_in` va dang nhap.

### 6. Sau login, dashboard luu auth headers vao cookie

Frontend luu ket qua auth vao cookie `cw_d_session_info`:

- [app/javascript/dashboard/store/utils/api.js](/Users/nguyenxuanhai/workspace/haiyen/chatwoot-4.12.1/app/javascript/dashboard/store/utils/api.js)

```js
Cookies.set('cw_d_session_info', JSON.stringify(response.headers), {
  expires: differenceInDays(expiryDate, new Date()),
});
```

Cookie nay chua:

- `access-token`
- `token-type`
- `client`
- `expiry`
- `uid`

Sau do dashboard gan cac header nay vao moi request API:

- [app/javascript/dashboard/helper/APIHelper.js](/Users/nguyenxuanhai/workspace/haiyen/chatwoot-4.12.1/app/javascript/dashboard/helper/APIHelper.js)

## Login social/SSO hien tai thuc ra cung di qua SSO token

File:

- [app/controllers/devise_overrides/omniauth_callbacks_controller.rb](/Users/nguyenxuanhai/workspace/haiyen/chatwoot-4.12.1/app/controllers/devise_overrides/omniauth_callbacks_controller.rb)

Sau khi Google OAuth hoac SAML thanh cong, controller khong login truc tiep bang password/session. No redirect ve login page cung voi:

- `email`
- `sso_auth_token`

Do do, co che SSO token khong phai workaround moi, ma la mot phan chinh thuc cua luong auth hien tai.

## Co the khong dung chuc nang login mac dinh khong?

## Co.

Nhung can phan biet ro 2 muc:

### Muc 1. Khong dung man hinh login mac dinh, nhung van dung co che auth cua Chatwoot

Day la cach nen dung.

User dang nhap o he thong san co truoc, sau do he thong do redirect vao Chatwoot bang SSO link.

Ket qua:

- User khong nhin thay form login Chatwoot
- Khong can nhap lai mat khau
- Dashboard Chatwoot van hoat dong binh thuong
- Khong can sua sau vao frontend/backend core

### Muc 2. Bo han co che auth cua Chatwoot va dung hoan toan auth ben ngoai

Lam duoc, nhung khong nen neu muc tieu la giu dashboard Chatwoot.

Ly do:

- Rat nhieu API dang dua vao `current_user`
- `ApplicationController` dung `DeviseTokenAuth::Concerns::SetUserByToken`
- Phan quyen dua vao `Current.user`, `Current.account`, `Current.account_user`
- Dashboard mac dinh can bo header auth cua `devise_token_auth`

Nen neu bo han co che auth noi bo, anh/chị se phai sua rat nhieu cho.

## Cac phuong an tich hop

### Phuong an 1. Dung SSO link co san de auto-login vao dashboard

Day la phuong an tot nhat.

Chatwoot da co san endpoint platform de lay login link:

- [app/controllers/platform/api/v1/users_controller.rb](/Users/nguyenxuanhai/workspace/haiyen/chatwoot-4.12.1/app/controllers/platform/api/v1/users_controller.rb)
- [config/routes.rb](/Users/nguyenxuanhai/workspace/haiyen/chatwoot-4.12.1/config/routes.rb)

Route:

```text
GET /platform/api/v1/users/:id/login
```

Response:

```json
{ "url": "https://your-chatwoot/app/login?email=...&sso_auth_token=..." }
```

Endpoint nay yeu cau:

- `api_access_token` cua `PlatformApp`
- User phai duoc gan permissibility voi platform app

Spec da xac nhan hanh vi nay:

- [spec/controllers/platform/api/v1/users_controller_spec.rb](/Users/nguyenxuanhai/workspace/haiyen/chatwoot-4.12.1/spec/controllers/platform/api/v1/users_controller_spec.rb)

#### Luong de xuat

1. He thong san co xac thuc user
2. Backend goi Chatwoot Platform API:
   - tao user neu chua co
   - cap nhat user neu can
   - lay login link
3. Redirect trinh duyet sang login link
4. Chatwoot tu dang nhap

### Phuong an 2. Dung SAML SSO

Neu he thong hien tai la IdP SAML hoac co cong cu SSO chuan doanh nghiep, co the dung luong SAML san co cua Enterprise:

- [enterprise/config/initializers/omniauth_saml.rb](/Users/nguyenxuanhai/workspace/haiyen/chatwoot-4.12.1/enterprise/config/initializers/omniauth_saml.rb)

Phuong an nay hop ly neu:

- Anh/chị co ban Enterprise
- He thong hien tai da co SAML

Neu khong, phuong an 1 don gian hon.

### Phuong an 3. Chi dung API, khong dung dashboard Chatwoot

Trong `Api::BaseController`, Chatwoot cho phep auth bang `api_access_token`:

- [app/controllers/api/base_controller.rb](/Users/nguyenxuanhai/workspace/haiyen/chatwoot-4.12.1/app/controllers/api/base_controller.rb)
- [app/controllers/concerns/access_token_auth_helper.rb](/Users/nguyenxuanhai/workspace/haiyen/chatwoot-4.12.1/app/controllers/concerns/access_token_auth_helper.rb)

Neu request co:

```text
api_access_token: ...
```

thi backend co the set `Current.user` tu `AccessToken`.

Nhung cach nay phu hop hon cho:

- backend integration
- custom UI rieng
- bot/system integration

Khong phai cach tot nhat neu anh/chị muon dung nguyen dashboard web san co cua Chatwoot.

### Phuong an 4. Tu viet co che trust auth tu reverse proxy/header

Vi du:

- He thong ngoai dat `X-Authenticated-User`
- Chatwoot trust header do va tu set `current_user`

Lam duoc, nhung:

- Phai sua core auth
- De sai bao mat neu deploy sai proxy
- Kho merge/update ve sau

Khong khuyen nghi neu muc tieu la MVP nhanh, an toan, de maintain.

## Dieu kien de tich hop thanh cong

Du theo cach nao, user van can ton tai trong Chatwoot va co membership hop le.

Can dam bao:

1. User ton tai trong bang `users`
2. User co `account_user` voi account phu hop
3. Neu dung dashboard, user phai duoc cap token auth dung kieu `devise_token_auth`

Lien quan:

- [app/models/user.rb](/Users/nguyenxuanhai/workspace/haiyen/chatwoot-4.12.1/app/models/user.rb)
- [app/models/concerns/user_attribute_helpers.rb](/Users/nguyenxuanhai/workspace/haiyen/chatwoot-4.12.1/app/models/concerns/user_attribute_helpers.rb)

`active_account_user` va `current_account_user` anh huong truc tiep den role/quyen trong dashboard.

## Rui ro va luu y

### 1. SSO token hien tai bypass login form

Day la muc tieu cua no, nhung cung co nghia:

- Token phai duoc sinh o backend tin cay
- Khong nen de frontend he thong ngoai tu y sinh/lay token
- Chi nen redirect mot lan, ngan han

### 2. Token co han 5 phut

Trong Redis:

```rb
::Redis::Alfred.setex(sso_token_key(token), true, 5.minutes)
```

Nen luong redirect phai dien ra ngay sau khi sinh token.

### 3. MFA

Luong password login co xu ly MFA:

- [app/controllers/devise_overrides/sessions_controller.rb](/Users/nguyenxuanhai/workspace/haiyen/chatwoot-4.12.1/app/controllers/devise_overrides/sessions_controller.rb)

Nhung luong `sso_auth_token` dang di thang vao `handle_sso_authentication`.

Dieu nay co nghia la ve mat hanh vi hien tai, SSO token dang duoc xem la mot co che dang nhap du tin cay.

Neu anh/chị muon bat buoc MFA ngay ca khi login tu he thong ngoai, se can bo sung rule rieng.

### 4. Neu he thong hien tai multi-tenant

Can map ro:

- tenant nao cua he thong hien tai
- tuong ung `account` nao trong Chatwoot

Neu map sai, user co the login thanh cong nhung vao nham workspace/account.

## Phuong an khuyen nghi

Neu muc tieu la:

- giu nguyen dashboard Chatwoot
- bo man hinh login mac dinh
- tich hop vao he thong san co nhanh
- it sua core

Thi khuyen nghi:

### Huong tich hop nen dung

1. Tao `PlatformApp` trong Chatwoot
2. Dong bo user tu he thong san co vao Chatwoot bang Platform API
3. Gan user vao account phu hop
4. Khi user da login o he thong chinh, backend goi:
   - `GET /platform/api/v1/users/:id/login`
5. Redirect user sang URL Chatwoot tra ve

Ket qua:

- Khong can dung login page mac dinh theo nghia nguoi dung nhap mat khau
- Khong can sua sau dashboard
- Tuan thu luong auth san co cua Chatwoot

## Khong nen lam gi

Khong nen:

1. Xoa han Devise/DeviseTokenAuth neu van muon dung dashboard Chatwoot
2. Cho frontend ben ngoai tu lay/sinh SSO token
3. Tu sua tat ca controller de trust session ngoai ma khong co lop auth ro rang

## Tong ket

Codebase nay da cho thay Chatwoot ho tro san mot cach tich hop login giot nuoc:

- login page co the duoc bo qua
- user co the auto-login bang `sso_auth_token`
- Platform API da co endpoint sinh login link

Vi vay, cau tra loi thuc te la:

**Co the khong dung form login mac dinh cua source code nay de tich hop vao he thong san co, va day la huong nen dung.**

Huong phu hop nhat la:

- xac thuc o he thong hien tai
- dong bo user vao Chatwoot
- redirect vao Chatwoot bang SSO login link

Khong can thay doi kien truc auth lon, va rui ro maintain thap hon rat nhieu so voi viec tu viet lai auth cho dashboard.
