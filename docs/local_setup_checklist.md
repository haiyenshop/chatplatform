# Checklist chạy Chatwoot trên local

## Mục tiêu

Tài liệu này là checklist ngắn gọn để chạy dự án trên local nhanh nhất.

Có 2 cách:

1. Chạy trực tiếp trên máy
2. Chạy bằng Docker

Nếu mới tiếp cận repo, nên ưu tiên Docker trước.

## Thông tin môi trường cần biết

### Phiên bản chính

- Ruby: `3.4.4`
- Node: `24.x`
- pnpm: `10.x`

### Dịch vụ cần có

- PostgreSQL
- Redis
- Sidekiq
- Vite dev server

### File tham chiếu

- [package.json](/Users/nguyenxuanhai/workspace/haiyen/chatwoot-4.12.1/package.json)
- [.ruby-version](/Users/nguyenxuanhai/workspace/haiyen/chatwoot-4.12.1/.ruby-version)
- [Procfile.dev](/Users/nguyenxuanhai/workspace/haiyen/chatwoot-4.12.1/Procfile.dev)
- [docker-compose.yaml](/Users/nguyenxuanhai/workspace/haiyen/chatwoot-4.12.1/docker-compose.yaml)

## Phần A: Chạy trực tiếp trên máy

## 1. Cài Ruby đúng phiên bản

```bash
rbenv install 3.4.4
rbenv local 3.4.4
eval "$(rbenv init -)"
```

Kiểm tra:

```bash
ruby -v
```

## 2. Cài Node và pnpm

```bash
nvm install 24
nvm use 24
corepack enable
corepack prepare pnpm@10.2.0 --activate
```

Kiểm tra:

```bash
node -v
pnpm -v
```

## 3. Tạo file môi trường

```bash
cp .env.example .env
```

Sửa các biến tối thiểu trong `.env`:

```env
RAILS_ENV=development
FRONTEND_URL=http://localhost:3000
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DATABASE=chatwoot_dev
POSTGRES_USERNAME=postgres
POSTGRES_PASSWORD=
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
ACTIVE_STORAGE_SERVICE=local
ENABLE_ACCOUNT_SIGNUP=false
MAILER_SENDER_EMAIL=Chatwoot <accounts@chatwoot.local>
SMTP_ADDRESS=localhost
SMTP_PORT=1025
SECRET_KEY_BASE=thay_bang_secret_that
```

## 4. Tạo `SECRET_KEY_BASE`

```bash
eval "$(rbenv init -)"
bundle exec rake secret
```

Copy kết quả vào `.env`.

## 5. Nếu cần MFA, tạo encryption keys

```bash
eval "$(rbenv init -)"
bundle exec rails db:encryption:init
```

Copy 3 giá trị sinh ra vào `.env`:

- `ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY`
- `ACTIVE_RECORD_ENCRYPTION_DETERMINISTIC_KEY`
- `ACTIVE_RECORD_ENCRYPTION_KEY_DERIVATION_SALT`

## 6. Cài dependencies

```bash
eval "$(rbenv init -)"
bundle install
pnpm install
```

## 7. Đảm bảo PostgreSQL và Redis đang chạy

Kiểm tra PostgreSQL:

```bash
pg_isready -h localhost -p 5432
```

Kiểm tra Redis:

```bash
redis-cli ping
```

Kỳ vọng:

```text
PONG
```

## 8. Chuẩn bị database

```bash
eval "$(rbenv init -)"
bundle exec rails db:prepare
```

Nếu muốn có dữ liệu mẫu:

```bash
bundle exec rails db:seed
```

## 9. Chạy ứng dụng

```bash
pnpm dev
```

Hoặc:

```bash
overmind start -f ./Procfile.dev
```

## 10. Mở ứng dụng

Truy cập:

```text
http://localhost:3000
```

## Phần B: Chạy bằng Docker

## 1. Tạo `.env`

```bash
cp .env.example .env
```

Sửa tối thiểu:

```env
RAILS_ENV=development
FRONTEND_URL=http://localhost:3000
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_USERNAME=postgres
POSTGRES_PASSWORD=
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=
ACTIVE_STORAGE_SERVICE=local
ENABLE_ACCOUNT_SIGNUP=false
SECRET_KEY_BASE=thay_bang_secret_that
```

## 2. Build và chạy services

```bash
docker compose up --build
```

Services chính sẽ được chạy:

- rails
- sidekiq
- vite
- postgres
- redis
- mailhog

## 3. Prepare database

Mở terminal khác:

```bash
docker compose exec rails bundle exec rails db:prepare
docker compose exec rails bundle exec rails db:seed
```

## 4. Truy cập local

- App: `http://localhost:3000`
- Mailhog: `http://localhost:8025`
- Vite: `http://localhost:3036`

## Phần C: Các lệnh phát triển thường dùng

## 1. Chạy dev

```bash
pnpm dev
```

## 2. Seed dữ liệu

```bash
bundle exec rails db:seed
bundle exec rails search:setup_test_data
```

## 3. Lint frontend

```bash
pnpm eslint
pnpm eslint:fix
```

## 4. Lint Ruby

```bash
bundle exec rubocop -a
```

## 5. Chạy test frontend

```bash
pnpm test
pnpm test:watch
```

## 6. Chạy test Ruby

```bash
eval "$(rbenv init -)"
bundle exec rspec
bundle exec rspec spec/path/to/file_spec.rb
bundle exec rspec spec/path/to/file_spec.rb:123
```

## Phần D: Checklist xác nhận môi trường đã lên đúng

Sau khi chạy local, nên kiểm tra nhanh:

- [ ] `ruby -v` đúng `3.4.4`
- [ ] `node -v` đúng major `24`
- [ ] `pnpm -v` đúng major `10`
- [ ] `.env` đã tồn tại
- [ ] PostgreSQL đang chạy
- [ ] Redis đang chạy
- [ ] `bundle install` thành công
- [ ] `pnpm install` thành công
- [ ] `bundle exec rails db:prepare` thành công
- [ ] `pnpm dev` hoặc `docker compose up --build` chạy không lỗi
- [ ] mở được `http://localhost:3000`

## Phần E: Lỗi thường gặp và cách xử lý

## 1. Lỗi Bundler hoặc Ruby version

Triệu chứng:

- `bundle install` lỗi
- native gem không build được

Cách xử lý:

- kiểm tra lại `ruby -v`
- chạy lại `eval "$(rbenv init -)"`
- đảm bảo đang dùng Ruby `3.4.4`

## 2. Lỗi thiếu package frontend

Triệu chứng:

- Vite không lên
- import frontend lỗi

Cách xử lý:

```bash
pnpm install
```

## 3. Lỗi kết nối PostgreSQL

Kiểm tra:

- `POSTGRES_HOST`
- `POSTGRES_PORT`
- `POSTGRES_DATABASE`
- `POSTGRES_USERNAME`
- `POSTGRES_PASSWORD`

Chạy lại:

```bash
bundle exec rails db:prepare
```

## 4. Lỗi kết nối Redis

Kiểm tra:

- `REDIS_URL`
- `REDIS_PASSWORD`

Redis rất quan trọng vì được dùng cho:

- Sidekiq
- token
- cache
- một phần realtime state

## 5. Mở trang được nhưng tính năng không chạy đủ

Nguyên nhân thường gặp:

- Sidekiq chưa chạy
- Redis chưa chạy
- Vite chưa chạy

Hãy kiểm tra đủ 3 process trong `Procfile.dev`:

- `backend`
- `worker`
- `vite`

## 6. Login hoặc redirect sai URL

Kiểm tra:

- `FRONTEND_URL`
- cookie trình duyệt
- cổng đang dùng có đúng `3000` không

## Gợi ý dùng thực tế

Nếu đội kỹ thuật cần môi trường ổn định nhanh:

- ưu tiên Docker

Nếu cần debug sâu bằng IDE:

- chạy trực tiếp trên máy

Nếu chỉ muốn kiểm tra app có lên không:

1. `cp .env.example .env`
2. sửa `FRONTEND_URL`, `POSTGRES_*`, `REDIS_URL`, `SECRET_KEY_BASE`
3. `bundle install`
4. `pnpm install`
5. `bundle exec rails db:prepare`
6. `pnpm dev`
7. mở `http://localhost:3000`
