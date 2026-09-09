# Factory Doctor — giao diện Vue

Bước 1 của dự án DENSO A1: dựng bố cục giám sát bằng Vue 3 + Tailwind CSS.

## Chạy trên máy

Cài Node.js 22.12 trở lên. Mở terminal ở thư mục `frontend`:

```bash
npm install
npm run dev
```

Mở địa chỉ Vite in trong terminal (thường là http://localhost:5173).

Kiểm tra bản đóng gói:

```bash
npm run build
```

## Đọc code theo thứ tự

1. `src/main.js`: khởi động Vue và nạp CSS.
2. `src/App.vue`: bố cục tổng, menu, các thẻ thông số.
3. `src/components/MachineViewport.vue`: vùng chờ mô hình 3D.
4. `src/components/SensorPanel.vue`: khung của một biểu đồ, dùng lại cho cả ba cảm biến.
5. `src/style.css`: Tailwind và màu sắc, kích thước, bố cục thích ứng màn hình.

`sensors` trong App.vue chỉ mô tả tên, đơn vị, màu của cảm biến; chưa phải dữ liệu đo. Dấu “—” và trạng thái “Chưa đánh giá” tránh nhầm khung giao diện với kết quả thực.

## Phạm vi hiện tại

- Menu dẫn tới từng phần; trên điện thoại có nút mở/đóng menu.
- Bố cục tối, điểm nhấn xanh ngọc, ba vùng biểu đồ xếp dọc.
- Vùng 3D là khung chờ, chưa tích hợp Three.js.
- Chưa có mô phỏng, FastAPI hoặc kết quả mô hình học máy.

Bước 2: thêm dữ liệu giả lập và ba biểu đồ TP2, TP3, Motor_current dùng chung thời gian; sau đó thêm Chạy / Tạm dừng.
