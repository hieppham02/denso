// Dữ liệu giả lập phục vụ giao diện; không phải mô hình vật lý đã hiệu chỉnh.
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
  "COMP",
  "DV_eletric",
  "Towers",
  "MPG",
  "LPS",
  "Pressure_switch",
  "Oil_level",
  "Caudal_impulses",
];
export const devices = Array.from({ length: 24 }, (_, i) => ({
  id: `APU-${String(i + 1).padStart(2, "0")}`,
  line: "ABCD"[Math.floor(i / 6)],
}));
export const SIMULATION_DURATION = 900;
export const LEAK_START = 60;
export const SAMPLE_SECONDS = 5;
export const DEMO_TIMESTAMP = Date.UTC(2026, 8, 9, 3, 0, 0); // 10:00 tại Việt Nam

export function createModel(id = "APU-01") {
  return {
    pressure: 8.4 + Number(id.slice(-2)) * 0.009,
    loaded: false,
    temperature: 54,
  };
}

// Áp suất, dòng điện, nhiệt độ và các bit đều lấy từ cùng một trạng thái máy.
export function nextSample(model, time, leaking = false) {
  for (let second = 0; second < SAMPLE_SECONDS; second++) {
    if (model.pressure <= 7) model.loaded = true;
    if (model.pressure >= 8.8) model.loaded = false;
    model.pressure += (model.loaded ? 0.05 : 0) - 0.015 - (leaking ? 0.02 : 0);
    model.temperature += ((model.loaded ? 61 : 52) - model.temperature) * 0.002;
  }
  const pressure = model.pressure;
  return {
    time,
    timestamp: new Date(DEMO_TIMESTAMP + time * 1000).toISOString(),
    TP2: model.loaded ? pressure + 0.14 : 0.025,
    TP3: pressure,
    H1: pressure - 0.045,
    Reservoirs: pressure - 0.02,
    DV_pressure: model.loaded ? 0.025 : 0.012,
    Oil_temperature: model.temperature,
    Motor_current: model.loaded ? 7.05 + 0.14 * Math.sin(time / 9) : 0.04,
    COMP: model.loaded ? 0 : 1,
    DV_eletric: Number(model.loaded),
    Towers: Math.floor((time + 7200) / 120) % 2,
    MPG: Number(model.loaded),
    LPS: Number(pressure < 7),
    Pressure_switch: 1,
    Oil_level: 1,
    Caudal_impulses: Number(model.loaded),
    loaded: model.loaded,
  };
}
export function createHistory(id, hasAlert = false) {
  const model = createModel(id),
    samples = [];
  for (let time = -3600; time <= 0; time += SAMPLE_SECONDS) {
    samples.push(nextSample(model, time, hasAlert && time >= -300));
  }
  return samples;
}
export function createSimulation(id) {
  const model = createModel(id),
    samples = [];
  for (let time = -300; time <= 0; time += SAMPLE_SECONDS)
    samples.push(nextSample(model, time));
  return { model, samples, elapsed: 0 };
}
export function advanceSimulation(session, scenario, speed = 1) {
  if (!["normal", "leak"].includes(scenario) || ![1, 2, 5].includes(speed))
    throw new Error("Cấu hình mô phỏng không hợp lệ");
  for (let i = 0; i < speed && session.elapsed < SIMULATION_DURATION; i++) {
    session.elapsed += SAMPLE_SECONDS;
    session.samples.push(
      nextSample(
        session.model,
        session.elapsed,
        scenario === "leak" && session.elapsed >= LEAK_START,
      ),
    );
  }
  // Giữ tối đa 15 phút để bộ nhớ không tăng theo thời gian.
  session.samples = session.samples.filter(
    (sample) => sample.time >= session.elapsed - SIMULATION_DURATION,
  );
  return session;
}
export function formatTime(seconds, relative = false) {
  if (relative)
    return `${seconds < 0 ? "−" : ""}${String(Math.floor(Math.abs(seconds) / 60)).padStart(2, "0")}:${String(Math.floor(Math.abs(seconds) % 60)).padStart(2, "0")}`;
  return new Date(DEMO_TIMESTAMP + seconds * 1000).toLocaleTimeString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
  });
}
