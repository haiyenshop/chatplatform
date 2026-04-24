# Hướng dẫn Access Token trong Profile Settings

Tài liệu này mô tả Access Token nằm trong màn hình `Profile Settings` của Chatwoot/AlbumPik Chat, cách token được dùng để gọi API, phạm vi quyền hạn, ví dụ tích hợp và các lưu ý bảo mật khi đưa vào hệ thống bên ngoài.

## 1. Access Token là gì?

Access Token trong `Profile Settings` là token API cá nhân của user đang đăng nhập.

Token này được dùng khi một hệ thống bên ngoài muốn gọi Chatwoot API thay mặt user đó, ví dụ:

- Backend AlbumPik cần đọc danh sách hội thoại.
- Script nội bộ cần lấy thông tin contact/conversation.
- Hệ thống CRM hoặc automation cần gửi message vào một conversation.
- Công cụ như n8n, Make, Zapier, cron job hoặc service riêng cần đồng bộ dữ liệu.

Token này không phải là:

- Facebook Page Access Token.
- Instagram/WhatsApp token.
- Password đăng nhập Chatwoot.
- Devise session token của browser.
- Platform App token dùng cho Platform API.

Trong source code, token này là record `AccessToken` gắn với owner là `User`.

File liên quan:

- `app/models/access_token.rb`
- `app/models/concerns/access_tokenable.rb`
- `app/controllers/concerns/access_token_auth_helper.rb`
- `app/controllers/api/base_controller.rb`
- `app/controllers/api/v1/profiles_controller.rb`

## 2. Token này nằm ở đâu trên UI?

Đường dẫn trên UI:

```text
Avatar góc trái dưới -> Profile Settings -> Access Token
```

Trong màn hình này có các chức năng:

- `Copy`: copy token hiện tại.
- Icon mắt: hiện/ẩn token.
- `Reset`: tạo token mới và vô hiệu hoá token cũ.

Frontend render token từ `currentUser.access_token`.

Source liên quan:

- `app/javascript/dashboard/routes/dashboard/settings/profile/Index.vue`
- `app/javascript/dashboard/routes/dashboard/settings/profile/AccessToken.vue`

## 3. Backend xác thực Access Token như thế nào?

Khi gọi API, hệ thống kiểm tra token từ HTTP header:

```http
api_access_token: <ACCESS_TOKEN>
```

Trong source:

```ruby
token = request.headers[:api_access_token] || request.headers[:HTTP_API_ACCESS_TOKEN]
@access_token = AccessToken.find_by(token: token) if token.present?
```

Nếu token hợp lệ:

- Backend lấy owner của token.
- Nếu owner là `User`, hệ thống set `Current.user`.
- Request được xử lý giống như user đó đang gọi API.

Điều này có nghĩa là quyền API đi theo quyền của user sở hữu token.

## 4. Header đúng khi gọi API

Header cần dùng:

```http
api_access_token: YOUR_ACCESS_TOKEN
```

Ví dụ bằng `curl`:

```bash
curl -X GET "https://chat.albumpik.com/api/v1/accounts/6/conversations" \
  -H "api_access_token: YOUR_ACCESS_TOKEN"
```

Lưu ý: đây không phải Bearer token. Không dùng dạng này nếu API không hỗ trợ:

```http
Authorization: Bearer YOUR_ACCESS_TOKEN
```

## 5. Account ID lấy ở đâu?

Phần lớn API cấp account có dạng:

```text
/api/v1/accounts/:account_id/...
```

Với production hiện tại, URL UI đang là:

```text
https://chat.albumpik.com/app/accounts/6/...
```

Vì vậy `account_id` đang là:

```text
6
```

Ví dụ API:

```text
https://chat.albumpik.com/api/v1/accounts/6/conversations
```

## 6. Ví dụ gọi API thường dùng

### 6.1. Lấy danh sách conversations

```bash
curl -X GET "https://chat.albumpik.com/api/v1/accounts/6/conversations" \
  -H "api_access_token: YOUR_ACCESS_TOKEN"
```

### 6.2. Xem chi tiết một conversation

Ví dụ conversation id trên URL UI là `21`:

```text
https://chat.albumpik.com/app/accounts/6/conversations/21
```

Gọi API:

```bash
curl -X GET "https://chat.albumpik.com/api/v1/accounts/6/conversations/21" \
  -H "api_access_token: YOUR_ACCESS_TOKEN"
```

### 6.3. Lấy danh sách message trong conversation

```bash
curl -X GET "https://chat.albumpik.com/api/v1/accounts/6/conversations/21/messages" \
  -H "api_access_token: YOUR_ACCESS_TOKEN"
```

### 6.4. Gửi tin nhắn outgoing vào conversation

```bash
curl -X POST "https://chat.albumpik.com/api/v1/accounts/6/conversations/21/messages" \
  -H "api_access_token: YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Xin chào, mình hỗ trợ bạn nhé",
    "message_type": "outgoing"
  }'
```

### 6.5. Assign conversation cho một agent

Tuỳ endpoint và payload hiện tại của Chatwoot, dạng thường gặp:

```bash
curl -X POST "https://chat.albumpik.com/api/v1/accounts/6/conversations/21/assignments" \
  -H "api_access_token: YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "assignee_id": 123
  }'
```

### 6.6. Đổi trạng thái conversation

Ví dụ mở lại conversation:

```bash
curl -X POST "https://chat.albumpik.com/api/v1/accounts/6/conversations/21/toggle_status" \
  -H "api_access_token: YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "open"
  }'
```

Ví dụ resolve conversation:

```bash
curl -X POST "https://chat.albumpik.com/api/v1/accounts/6/conversations/21/toggle_status" \
  -H "api_access_token: YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "resolved"
  }'
```

## 7. Ví dụ dùng bằng JavaScript backend

Không nên đặt Access Token trong frontend public. Ví dụ dưới đây dành cho backend Node.js.

```js
const accessToken = process.env.CHATWOOT_ACCESS_TOKEN;
const accountId = 6;

async function fetchConversations() {
  const response = await fetch(
    `https://chat.albumpik.com/api/v1/accounts/${accountId}/conversations`,
    {
      headers: {
        api_access_token: accessToken,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Chatwoot API error: ${response.status}`);
  }

  return response.json();
}
```

## 8. Ví dụ dùng bằng Ruby backend

```ruby
require 'net/http'
require 'json'

uri = URI('https://chat.albumpik.com/api/v1/accounts/6/conversations')
request = Net::HTTP::Get.new(uri)
request['api_access_token'] = ENV.fetch('CHATWOOT_ACCESS_TOKEN')

response = Net::HTTP.start(uri.hostname, uri.port, use_ssl: true) do |http|
  http.request(request)
end

raise "Chatwoot API error: #{response.code}" unless response.is_a?(Net::HTTPSuccess)

data = JSON.parse(response.body)
puts data
```

## 9. Quyền hạn của Access Token

Access Token đi theo user sở hữu token.

Ví dụ:

- Token của admin có quyền rộng hơn.
- Token của agent thường chỉ thao tác trong phạm vi agent được phép.
- Nếu user không thuộc account `6`, token không nên dùng được cho account `6`.
- Nếu user bị xoá, khoá hoặc mất quyền trong account, token sẽ không còn phù hợp để gọi các API cần quyền đó.

Khi backend xác thực bằng token, source set:

```ruby
@resource = @access_token.owner
Current.user = @resource if allowed_current_user_type?(@resource)
```

Sau đó các controller/policy tiếp tục kiểm tra quyền theo user hiện tại.

## 10. Reset token hoạt động như thế nào?

Nút `Reset` trong UI gọi endpoint:

```text
POST /api/v1/profile/reset_access_token
```

Trong source:

```ruby
def reset_access_token
  @user.access_token.regenerate_token
  @user.reload
end
```

Sau khi reset:

- Token cũ hết hiệu lực.
- Token mới được sinh ra.
- Các hệ thống đang dùng token cũ sẽ lỗi xác thực.
- Cần cập nhật token mới vào biến môi trường hoặc secret manager của hệ thống tích hợp.

Nên reset token ngay khi:

- Token bị lộ.
- Token từng được gửi qua chat/email không an toàn.
- Nhân sự nghỉ việc.
- Muốn xoay vòng credential định kỳ.

## 11. Lỗi thường gặp

### 11.1. Lỗi 401 Invalid Access Token

Nguyên nhân thường gặp:

- Header sai tên.
- Token bị copy thiếu ký tự.
- Token đã bị reset.
- Token thuộc user khác hoặc môi trường khác.

Cần kiểm tra:

```http
api_access_token: YOUR_ACCESS_TOKEN
```

Không dùng:

```http
access_token: YOUR_ACCESS_TOKEN
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### 11.2. Lỗi 403 hoặc không đủ quyền

Nguyên nhân thường gặp:

- User sở hữu token không có quyền với account/inbox/conversation đó.
- User không phải admin nhưng gọi endpoint yêu cầu admin.
- Conversation thuộc account khác.

### 11.3. Gọi đúng token nhưng không thấy dữ liệu

Cần kiểm tra:

- `account_id` trong URL API có đúng không.
- User sở hữu token có thuộc account đó không.
- Filter/pagination của API có đang giới hạn kết quả không.
- Dữ liệu nằm ở inbox/account khác không.

## 12. Bảo mật và best practices

Nên làm:

- Lưu token trong biến môi trường hoặc secret manager.
- Chỉ dùng token ở backend/server-side.
- Tạo một user riêng cho tích hợp, ví dụ `integration@albumpik.com`.
- Cấp quyền vừa đủ cho integration user.
- Reset token nếu nghi ngờ bị lộ.
- Log request nhưng không log token.
- Giới hạn nơi có thể đọc biến môi trường chứa token.

Không nên làm:

- Không commit token vào Git.
- Không hardcode token trong source code.
- Không đưa token vào frontend JavaScript.
- Không gửi token trong URL query string.
- Không chia sẻ token qua screenshot hoặc chat công khai.
- Không dùng token admin cho mọi tích hợp nếu không thật sự cần.

## 13. Khuyến nghị cho AlbumPik

Nếu AlbumPik cần tích hợp ổn định với Chatwoot production, nên dùng mô hình sau:

1. Tạo một user riêng trong Chatwoot, ví dụ:

```text
albumpik.integration@albumpik.com
```

2. Gán user này vào đúng account/studio cần tích hợp.

3. Cấp role/quyền vừa đủ.

4. Copy Access Token của user này.

5. Lưu token vào backend AlbumPik:

```env
CHATWOOT_BASE_URL=https://chat.albumpik.com
CHATWOOT_ACCOUNT_ID=6
CHATWOOT_ACCESS_TOKEN=xxxxxxxxxxxxxxxx
```

6. Tất cả API call từ AlbumPik backend sang Chatwoot dùng header:

```http
api_access_token: xxxxxxxxxxxxxxxx
```

7. Không để token này xuất hiện ở browser hoặc mobile app.

## 14. Khi nào nên dùng Platform App token thay vì User Access Token?

User Access Token phù hợp khi:

- Tích hợp đơn giản.
- Cần thao tác như một agent/admin cụ thể.
- Chỉ phục vụ một account/studio hoặc ít account.
- Muốn nhanh và dễ debug.

Platform App token phù hợp hơn khi:

- AlbumPik là hệ thống trung tâm tạo account/user trên Chatwoot.
- Cần quản lý nhiều tenant/studio ở quy mô lớn.
- Cần onboarding tự động.
- Cần phân tách quyền theo app thay vì theo user cá nhân.

Trong source hiện tại, `docs/albumpik_sso_rollout.md` đang nói riêng về Platform App token. Không nên nhầm token đó với Access Token trong Profile Settings.

## 15. Checklist tích hợp nhanh

- Xác định `account_id`, ví dụ `6`.
- Tạo hoặc chọn user dùng cho tích hợp.
- Copy Access Token trong `Profile Settings`.
- Lưu token vào backend/secret manager.
- Test API đơn giản:

```bash
curl -X GET "https://chat.albumpik.com/api/v1/accounts/6/conversations" \
  -H "api_access_token: YOUR_ACCESS_TOKEN"
```

- Nếu thành công, tích hợp các API cần thiết.
- Nếu thất bại, kiểm tra header, token, account id và quyền user.
- Sau khi deploy tích hợp, không log token.

## 16. Tóm tắt ngắn

Access Token trong `Profile Settings` là chìa khoá API cá nhân của user Chatwoot.

Dùng bằng header:

```http
api_access_token: YOUR_ACCESS_TOKEN
```

Quyền API đi theo user sở hữu token. Nếu token bị lộ, bấm `Reset` để tạo token mới và cập nhật lại hệ thống tích hợp.
