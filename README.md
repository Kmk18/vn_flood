# VNFlood — Hệ thống cảnh báo lũ lụt thời gian thực

Hệ thống cảnh báo lũ sớm cho Việt Nam. Cứ mỗi 3 giờ, hệ thống tự động tải dữ liệu mưa vệ tinh NASA IMERG, chạy mô hình LightGBM trên 208 lưu vực sông và hiển thị dự báo rủi ro lên ứng dụng Android qua backend triển khai trên Google Cloud Platform.

---

## Thành phần hệ thống

| Thành phần | Công nghệ | Mô tả |
|------------|-----------|-------|
| Backend API | Node.js 22, Express, TypeScript, Drizzle ORM | 31 endpoint, 7 module |
| ML Service | Python 3.11, FastAPI, LightGBM | Pipeline ingest + suy diễn |
| Mobile App | React Native 0.81, Expo 54, Zustand | Ứng dụng Android |
| Database | Cloud SQL PostgreSQL 16 | Lưu trữ chính |
| Cache | Memorystore Redis 7 | Cache dự báo và điểm sơ tán |
| Hạ tầng | Google Cloud Platform (asia-southeast1) | Cloud Run, GCS, Scheduler |

---

## Cấu trúc thư mục

```
vnflood/
├── src/
│   ├── backend/       # Express API server
│   │   ├── src/modules/   # auth, users, flood, alerts, rescue, admin, chat
│   │   └── Dockerfile
│   ├── ml2/           # Python ML service
│   │   ├── train.py       # Script huấn luyện (chạy cục bộ)
│   │   ├── infer.py       # FastAPI inference endpoint
│   │   ├── features.py    # Trích xuất đặc trưng
│   │   ├── imerg.py       # Tải dữ liệu NASA IMERG
│   │   └── Dockerfile
│   └── mobile/        # React Native app
│       ├── src/screens/
│       ├── src/stores/
│       └── android/       # Gradle build
├── deploy/            # Script triển khai GCP
└── docs/              # Tài liệu chi tiết
```

---

## Cài đặt và chạy

### Backend

```bash
cd src/backend
npm install
cp .env.example .env      # điền các biến môi trường
npm run db:migrate
npm run dev
```

Các biến môi trường cần thiết:

| Biến | Mô tả |
|------|-------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Khóa ký JWT (ít nhất 32 ký tự) |
| `INGEST_SECRET` | Secret header cho endpoint ingest |
| `REDIS_URL` | Redis connection URL |
| `GEMINI_API_KEY` | Google Gemini API key |
| `ML_SERVICE_URL` | URL nội bộ của ML service |
| `FIREBASE_SA_KEY` | Đường dẫn đến Firebase service-account JSON |

```bash
npm test              # 102 unit tests
npm run test:coverage # Báo cáo độ phủ
```

### ML Service

```bash
cd src/ml2
pip install -r requirements.txt
uvicorn infer:app --reload --port 8080
```

Cần tài khoản NASA Earthdata để tải IMERG:

```bash
export EARTHDATA_USERNAME=...
export EARTHDATA_PASSWORD=...
```

Huấn luyện mô hình (chạy cục bộ, khoảng 2–6 giờ):

```bash
python train.py
# Đầu ra: lgbm_flood_v3.pkl, feature_cols_v3.pkl,
#          train_medians_v3.pkl, model_meta_v3.json
```

Upload artifact lên GCS trước khi deploy:

```bash
gsutil cp *.pkl model_meta_v3.json gs://vietnam-flood-models/
```

### Mobile

```bash
cd src/mobile
npm install
npx expo start        # quét QR bằng Expo Go hoặc chạy trên emulator

# Build APK production
cd android
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a --no-daemon
# Đầu ra: app/build/outputs/apk/release/app-release.apk (~29,8 MB)
```

### Triển khai lên GCP

```bash
cd deploy
./3_deploy.sh
```

Script build Docker image, push lên Artifact Registry, deploy lên Cloud Run với zero-downtime (dùng `--no-traffic` rồi chuyển lưu lượng sau khi health check thành công).

Xem [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) để biết cách thiết lập hạ tầng GCP từ đầu.

---

## Mô hình dự báo

Mô hình LightGBM v3 dự báo lũ cho **208 lưu vực cấp Level-7** (HydroBASINS) trên toàn Việt Nam.

| Chỉ số | Giá trị |
|--------|---------|
| AUC-ROC (tập kiểm tra 2022–2023) | 0,9952 |
| Average Precision / PR-AUC | 0,9201 |
| F1 tại ngưỡng vận hành | 0,7906 |
| Precision | 0,9152 |
| Recall | 0,6959 |
| Ngưỡng quyết định τ* | 0,857 |
| Khoảng cách train–test | 0,0046 |

Dữ liệu huấn luyện: 1,9 triệu hàng, giai đoạn 2012–2023, tỷ lệ lũ 4,56%.

Bộ đặc trưng gồm 27 đặc trưng thuộc 7 nhóm: mưa tích lũy đa khung thời gian, chỉ số ẩm tiền mưa (API), lưu lượng đại diện (Rational Method), bất thường khí hậu, bão nhiệt đới (IBTrACS), mã hóa mùa vụ và đặc trưng tương tác.

Mức rủi ro được ánh xạ từ xác suất đầu ra:

| Xác suất | Mức rủi ro |
|----------|------------|
| < 0,25 | Thấp |
| 0,25 – 0,50 | Trung bình |
| 0,50 – 0,75 | Cao |
| ≥ 0,75 | Nguy hiểm |

---

## API

Tất cả endpoint đặt dưới `/api/`. Xác thực bằng JWT Bearer token (access token 15 phút, refresh token 7 ngày với token rotation).

| Module | Endpoint chính |
|--------|----------------|
| Xác thực | `POST /auth/register` · `/auth/login` · `/auth/refresh` · `/auth/logout` |
| Người dùng | `GET/PATCH/DELETE /users/me` · `PATCH /users/me/password` · `POST /users/push-token` |
| Dự báo lũ | `GET /flood/basins` · `/flood/predictions/today` · `/flood/predictions/basin/:id` |
| Cảnh báo | `GET/POST/DELETE /official-alerts` · `POST/DELETE /official-alerts/:id/read` · `GET /official-alerts/stream` (SSE, public) |
| Cứu hộ | `GET/POST/PATCH/DELETE /rescue/points` · `POST/GET/PATCH /rescue/requests` |
| Quản trị | `GET /admin/stats` · `GET/PATCH/DELETE /admin/users/:id` |
| Chatbot | `POST /chat` |
| Nội bộ | `POST /internal/ingest` (header `x-ingest-secret`) |

Cache Redis: basins 24 giờ, dự báo 1 giờ, điểm sơ tán 1 giờ. Tất cả đều fail-open khi Redis không khả dụng.

---

## Thông báo real-time

- **FCM** — push notification hoạt động dù app đang mở, chạy nền hay bị tắt. Token lưu trong bảng `push_tokens`, gửi theo lô 500 token qua `sendEachForMulticast()`. Fire-and-forget sau khi response trả về.
- **SSE** (`GET /api/official-alerts/stream`) — endpoint công khai, không cần JWT. Backend duy trì `Set<Response>` trong bộ nhớ, gửi sự kiện khi có cảnh báo mới. Keepalive 25 giây.

---

## Kiểm thử

| Loại | Kết quả |
|------|---------|
| Unit test (102 ca, Jest + Supertest) | 102/102 đạt · ~38 giây |
| Độ phủ statements | 80,68% |
| Load test (3.875 request, đỉnh 50 req/s) | p95 = 162 ms · 0% lỗi |
| Stress test (34.275 request, đỉnh 500 req/s) | Ổn định đến 150 req/s · phục hồi trong 20 giây |
| UI test (51 kịch bản, Android 13) | 51/51 đạt |
