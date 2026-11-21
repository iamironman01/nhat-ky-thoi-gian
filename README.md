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

## Dữ liệu

Dữ liệu chỉ lưu trên trình duyệt của từng máy, không gửi đi đâu. Điện thoại và máy tính **chưa tự đồng bộ** với nhau (sẽ làm ở giai đoạn 2). Muốn chuyển dữ liệu thì dùng **Sao lưu ra file** rồi **Khôi phục từ file** trên máy kia.

## Kỹ thuật

HTML + CSS + JavaScript thuần, không cần cài đặt hay build. Chạy thử trên máy:

```bash
python3 -m http.server 8000
```

rồi mở http://localhost:8000
