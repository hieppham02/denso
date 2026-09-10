# DENSO A1 — FactoryDoctor

Dashboard Vue 3 + Tailwind giám sát nhiều máy nén khí, theo concept nền sáng đã duyệt.

## Chạy project

Project Vue nằm ngay tại thư mục gốc của repo (không cần `cd frontend`). Dùng Node.js 22.12 trở lên.

```bash
npm install
npm run dev
```

Mở địa chỉ Vite in trong terminal, mặc định là http://127.0.0.1:5174.

```bash
npm run build
node --test tests/*.test.js
```

## Các màn hình

- **Tổng quan / Thiết bị:** 24 máy trong 4 dây chuyền. Bấm bất kỳ máy nào để xem cảm biến.
- **Theo dõi thiết bị:** 7 thông số đo, 8 tín hiệu 0/1, cửa sổ 15/30/60 phút. Ba biểu đồ có chung trục thời gian và con trỏ; có thể đổi cảm biến thứ ba.
- **Mô phỏng:** Bình thường / Rò khí, Chạy / Tạm dừng / Chạy lại, tốc độ 1× / 2× / 5×. Ở 1×, mỗi giây thực tiến 5 giây mô phỏng. Rò khí bắt đầu tại 01:00 và phiên chạy dừng ở 15:00. Đổi kịch bản hoặc thiết bị đặt lại phiên; rời màn hình sẽ tạm dừng.
- **Cảnh báo:** tìm kiếm, lọc theo dây chuyền, mức độ, trạng thái.
- **Chi tiết sự cố:** cảm biến, điểm bất thường minh họa, tóm tắt bằng chứng, tài liệu, phương án xử lý.
- **Phê duyệt:** duyệt / từ chối / chỉnh sửa, ghi chú, hộp xác nhận.
- **Sau xử lý:** xác nhận đã thực hiện, tiến thời gian theo dõi 20 phút bằng nút demo, đóng sự cố hoặc yêu cầu phân tích lại.
- **Lịch sử / Tài liệu:** nhật ký quyết định trong phiên và tài liệu minh họa.

Có thể mở trực tiếp `/#device/APU-09`, `/#simulation/APU-09`, `/#incident/SC-024/approval`. Menu và các màn hình dùng hash để nút Back/Forward của trình duyệt hoạt động mà không cần cấu hình chuyển tiếp phía server.

## Cấu trúc chính

- `src/App.vue`: điều hướng, màn hình tổng quan và trạng thái dùng chung.
- `src/components/DeviceSensors.vue`: các thẻ cảm biến, trạng thái và ba biểu đồ.
- `src/components/SensorPanel.vue`: biểu đồ VueApexCharts, đồng bộ con trỏ và zoom.
- `src/components/FleetMap.vue`, `AlertTable.vue`: danh sách thiết bị và cảnh báo.
- `src/components/IncidentWorkspace.vue`: chi tiết, phê duyệt, theo dõi và lịch sử sự cố.
- `src/api/client.js`: request adapter tới FastAPI.
- `src/api/useSimulation.js`: quản lý timer và replay session từ CSV qua FastAPI.
- `src/domain/sensors.js`: metadata cảm biến MetroPT-3.
- `src/style.css`: giao diện sáng, responsive bằng CSS và Tailwind.

## Phạm vi dữ liệu

Frontend kết nối FastAPI qua `VITE_API_BASE_URL` và nhận dữ liệu cảm biến/replay từ MetroPT-3 CSV. Không gửi lệnh điều khiển ra ngoài. Các thao tác phê duyệt/lịch sử chỉ tồn tại trong bộ nhớ của phiên.

Tên cột theo MetroPT-3, gồm `DV_eletric` theo cách viết của dataset. Giá trị số, kịch bản, điểm bất thường và tài liệu đều là giả lập; điểm bất thường không phải xác suất lỗi. Mô phỏng dùng quy tắc nạp/tiêu thụ khí đơn giản, chưa hiệu chỉnh vật lý. Các bit 0/1 không tự biểu thị tốt/xấu. Ngưỡng và loại lỗi ở demo không được suy rộng sang máy thật.

Các KPI tổng quan hiện là chỉ số giao diện; dữ liệu cảm biến và replay được lấy từ FastAPI/MetroPT-3.

## Tailwind CSS và VueApexCharts

Tailwind v4 được cấu hình tại `vite.config.js` (`@tailwindcss/vite`) và `src/style.css` (`@import "tailwindcss"`). Các component hiện dùng utility trực tiếp, ví dụ:

```html
<section class="min-w-0 rounded-lg border border-slate-200 bg-white p-4 lg:p-5">
  <div class="flex flex-wrap items-center justify-between gap-3">...</div>
</section>
```

Các style riêng như sidebar, timeline, trạng thái được giữ trong `@layer components` để class Tailwind có thể ghi đè. Không cần thêm `tailwind.config.js` cho cấu hình v4 này.

Biểu đồ dùng `vue3-apexcharts` dành cho Vue 3, cùng `apexcharts`. `SensorPanel.vue` import component `VueApexCharts` trực tiếp, không đăng ký toàn cục.

Luồng biểu đồ:

1. FastAPI `/api/simulation/{device_id}/reset` nạp các mẫu đầu của CSV.
2. FastAPI `/api/simulation/{device_id}/tick` trả thêm mẫu theo timestamp CSV mỗi giây thực.
3. `App.vue` truyền `session.samples` xuống `DeviceSensors.vue`.
4. `DeviceSensors.vue` tạo group riêng cho ba biểu đồ và truyền xuống `SensorPanel.vue`.
5. `utils/sensorChart.js` chuyển mẫu thành `{ x: time, y: value }`, cấu hình trục, tooltip và vạch bất thường.
6. `VueApexCharts` tự cập nhật khi `series` hoặc `options` thay đổi.

Mỗi biểu đồ có ID riêng; ba biểu đồ trong cùng cụm chia sẻ `chart.group` và độ rộng nhãn trục Y để đồng bộ hover/zoom. Hai cụm trước/sau xử lý dùng group khác nhau. Nút zoom/pan/reset do ApexCharts cung cấp. Các giá trị đầu biểu đồ đồng bộ theo mẫu được trỏ tới.

Bản cập nhật đồng bộ tên `isRunning`, `currentScenario`, `playbackSpeed` giữa `App.vue` và `useSimulation.js`.

Sau khi cập nhật source, chạy tại thư mục gốc repo:

```bash
npm install
npm run dev
```

Kiểm tra:

```bash
npm test
npm run build
```

Tài liệu: [Tailwind + Vite](https://tailwindcss.com/docs/installation/using-vite), [VueApexCharts cho Vue 3](https://apexcharts.com/docs/vue-charts/), [Biểu đồ đồng bộ](https://apexcharts.com/docs/chart-types/synchronized-charts/).
