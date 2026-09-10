// Cấu hình hằng số toàn cục
export const SIMULATION_DURATION = 900; // 15 phút
export const LEAK_START = 60; // Bắt đầu rò rỉ ở giây 60
export const SAMPLE_SECONDS = 5; // Chu kỳ lấy mẫu (5s/lần)
export const DEMO_TIMESTAMP = Date.UTC(2026, 8, 9, 3, 0, 0); // 10:00 sáng VN (09/09/2026)

// Cấu hình Sensor
export const analogSensors = [
  { key: "TP2", name: "Áp suất máy nén", unit: "bar" },
  { key: "TP3", name: "Áp suất hệ thống", unit: "bar" },
  { key: "H1", name: "Áp suất H1", unit: "bar" },
  { key: "DV_pressure", name: "Chênh áp DV", unit: "bar" },
  { key: "Reservoirs", name: "Áp suất bình chứa", unit: "bar" },
  { key: "Oil_temperature", name: "Nhiệt độ dầu", unit: "°C" },
  { key: "Motor_current", name: "Dòng điện động cơ", unit: "A" },
];

export const digitalSensors = [
  "COMP", "DV_eletric", "Towers", "MPG",
  "LPS", "Pressure_switch", "Oil_level", "Caudal_impulses",
];

// Tạo 24 thiết bị chia vào 4 dây chuyền (A, B, C, D)
export const devices = Array.from({ length: 24 }, (_, i) => ({
  id: `APU-${String(i + 1).padStart(2, "0")}`,
  line: "ABCD"[Math.floor(i / 6)],
}));

// Khởi tạo model thiết bị ban đầu
export function createModel(deviceId = "APU-01") {
  const machineIndex = Number(deviceId.slice(-2));
  return {
    pressure: 8.4 + machineIndex * 0.009, // Máy có ID lớn áp suất nhỉnh hơn chút
    loaded: false, // Trạng thái nạp khí (chạy động cơ)
    temperature: 54, // Nhiệt độ dầu ban đầu
  };
}

// Hàm lõi: Tính toán mẫu dữ liệu tiếp theo dựa trên vật lý giả lập
export function nextSample(model, timeInSeconds, isLeaking = false) {
  // Mô phỏng diễn biến trong từng giây của 1 chu kỳ lấy mẫu
  for (let sec = 0; sec < SAMPLE_SECONDS; sec++) {
    // Logic bật/tắt nén khí (dưới 7 bar bật, trên 8.8 bar tắt)
    if (model.pressure <= 7.0) model.loaded = true;
    if (model.pressure >= 8.8) model.loaded = false;

    // Tính toán áp suất: (Nếu đang nạp thì tăng) - (Tiêu thụ cố định) - (Tụt áp do rò rỉ)
    const pressureIncrease = model.loaded ? 0.05 : 0;
    const baseConsumption = 0.015;
    const leakDrop = isLeaking ? 0.02 : 0;
    
    model.pressure += (pressureIncrease - baseConsumption - leakDrop);

    // Tính toán nhiệt độ (Tăng khi nén, giảm khi nghỉ)
    const targetTemp = model.loaded ? 61 : 52;
    model.temperature += (targetTemp - model.temperature) * 0.002;
  }

  const currentPressure = model.pressure;
  const isLoaded = model.loaded;

  return {
    time: timeInSeconds,
    timestamp: new Date(DEMO_TIMESTAMP + timeInSeconds * 1000).toISOString(),
    
    // Analog Data
    TP2: isLoaded ? currentPressure + 0.14 : 0.025,
    TP3: currentPressure,
    H1: currentPressure - 0.045,
    Reservoirs: currentPressure - 0.02,
    DV_pressure: isLoaded ? 0.025 : 0.012,
    Oil_temperature: model.temperature,
    // Dòng điện tạo dao động sin cho sinh động nếu đang nạp
    Motor_current: isLoaded ? 7.05 + 0.14 * Math.sin(timeInSeconds / 9) : 0.04,
    
    // Digital Data (Chuyển boolean thành 0/1)
    COMP: isLoaded ? 0 : 1, // 0 = đang nén (ngược logic)
    DV_eletric: Number(isLoaded),
    Towers: Math.floor((timeInSeconds + 7200) / 120) % 2, // Đổi tháp mỗi 2 phút
    MPG: Number(isLoaded),
    LPS: Number(currentPressure < 7),
    Pressure_switch: 1,
    Oil_level: 1,
    Caudal_impulses: Number(isLoaded),
    loaded: isLoaded,
  };
}

// Khởi tạo lịch sử 1 giờ trước đó
export function createHistory(deviceId, hasAlert = false) {
  const model = createModel(deviceId);
  const samples = [];
  
  for (let time = -3600; time <= 0; time += SAMPLE_SECONDS) {
    const isIncidentTime = hasAlert && time >= -300; // Bất thường trong 5 phút cuối
    samples.push(nextSample(model, time, isIncidentTime));
  }
  return samples;
}

// Khởi tạo phiên mô phỏng mới
export function createSimulation(deviceId) {
  const model = createModel(deviceId);
  const samples = [];
  
  // Nạp 5 phút dữ liệu nền
  for (let time = -300; time <= 0; time += SAMPLE_SECONDS) {
    samples.push(nextSample(model, time));
  }
  return { model, samples, elapsed: 0 };
}

// Đẩy nhanh mô phỏng 1 bước (tick)
export function advanceSimulation(session, scenario, playbackSpeed = 1) {
  if (!["normal", "leak"].includes(scenario) || ![1, 2, 5, 10].includes(playbackSpeed)) {
    throw new Error("Cấu hình mô phỏng không hợp lệ");
  }

  for (let i = 0; i < playbackSpeed && session.elapsed < SIMULATION_DURATION; i++) {
    session.elapsed += SAMPLE_SECONDS;
    const isLeaking = scenario === "leak" && session.elapsed >= LEAK_START;
    
    session.samples.push(nextSample(session.model, session.elapsed, isLeaking));
  }

  // Cắt tỉa mảng: Giữ tối đa độ dài SIMULATION_DURATION để tránh tràn RAM
  session.samples = session.samples.filter(
    (sample) => sample.time >= session.elapsed - SIMULATION_DURATION
  );
  
  return session;
}

// Format hiển thị thời gian
export function formatTime(seconds, isRelative = false) {
  if (isRelative) {
    const sign = seconds < 0 ? "−" : "";
    const mins = String(Math.floor(Math.abs(seconds) / 60)).padStart(2, "0");
    const secs = String(Math.floor(Math.abs(seconds) % 60)).padStart(2, "0");
    return `${sign}${mins}:${secs}`;
  }
  
  return new Date(DEMO_TIMESTAMP + seconds * 1000).toLocaleTimeString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
  });
}
