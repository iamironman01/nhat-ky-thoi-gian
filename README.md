# ⏱️ Nhật ký thời gian

App ghi lại một ngày của bạn: **bấm một nút** là ghi xong, rồi xem thời gian đã đi đâu.

- **⏱ Có thời gian** (Làm việc, Học, Ngủ, Lướt mạng…): bấm để bắt đầu, bấm lại (hoặc bấm việc khác) để dừng.
- **⚡ Bấm nhanh** (Uống nước, Cà phê, Uống thuốc…): bấm một lần, app ghi lại thời điểm.

## Các màn hình

| Màn hình | Làm gì |
|---|---|
| **Ghi nhận** | Lưới nút để bấm, thẻ "Đang làm" có đồng hồ, thanh tổng thời gian đã ghi hôm nay |
| **Dòng thời gian** | Danh sách theo ngày, bấm vào để sửa giờ hoặc xóa, nút ＋ để thêm thủ công |
| **Lịch** | Chọn ngày bất kỳ để xem tổng kết và chi tiết |
| **Thống kê** | 7 / 30 / 90 ngày / tất cả: biểu đồ tròn, trung bình mỗi ngày, giờ hay làm |

Nút ⚙️ ở màn Ghi nhận để thêm, sửa, ẩn, sắp xếp loại hoạt động và **sao lưu / khôi phục** dữ liệu.

## Cài lên điện thoại

Mở địa chỉ của app trên trình duyệt, sau đó:

- **iPhone (Safari):** bấm nút Chia sẻ → **Thêm vào MH chính**.
- **Android (Chrome):** bấm ⋮ → **Cài đặt ứng dụng** / **Thêm vào màn hình chính**.

## Dữ liệu & đồng bộ

Dữ liệu luôn lưu trên trình duyệt của từng máy, nên mất mạng vẫn dùng được.

**Đồng bộ (tùy chọn)** qua [Supabase](https://supabase.com): đăng nhập cùng email/mật khẩu trên nhiều máy
(nút ☁️ dưới ngày ở màn Hôm nay). Mỗi tài khoản chỉ đọc được dữ liệu của chính mình.

Cài đặt máy chủ đồng bộ:
1. Tạo project trên Supabase, chạy [`supabase/setup.sql`](supabase/setup.sql) trong **SQL Editor**.
2. Điền **Project URL** và khóa **anon / publishable** vào [`config.js`](config.js).
   Không bao giờ đặt khóa `service_role` / secret vào app.
3. Trong **Authentication → URL Configuration**, đặt **Site URL** là địa chỉ của app.

Cách đồng bộ: mỗi mục (loại hoạt động, lượt ghi, mục tiêu) là một dòng; bản sửa mới nhất thắng;
mục bị xóa được đánh dấu để máy khác cũng xóa theo.

## Kỹ thuật

HTML + CSS + JavaScript thuần, không cần cài đặt hay build. Chạy thử trên máy:

```bash
python3 -m http.server 8000
```

rồi mở http://localhost:8000
