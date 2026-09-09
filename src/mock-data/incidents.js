const DEFAULT_ACTION = "Kiểm tra xác nhận dấu hiệu rò khí theo quy trình bảo trì đã phê duyệt; ghi lại kết quả kiểm tra trước khi quyết định can thiệp.";

// Định nghĩa Enum hằng số trạng thái để chống lỗi gõ sai
export const INCIDENT_STATES = {
  NEW: "Mới",
  ANALYZING: "Đang phân tích",
  PENDING: "Chờ duyệt",
  PROCESSING: "Đang xử lý",
  MONITORING: "Đang theo dõi",
  CLOSED: "Đã đóng",
};

export const incidentStates = Object.values(INCIDENT_STATES);

export function createIncidents() {
  const rawData = [
    ["SC-024", "APU-09", "B", "Cao", INCIDENT_STATES.PENDING, "09:42", "Áp suất tụt nhanh, chu kỳ nén dày", 0.82],
    ["SC-023", "APU-16", "C", "Cao", INCIDENT_STATES.ANALYZING, "09:35", "Tín hiệu vận hành bất thường kéo dài", 0.78],
    ["SC-022", "APU-04", "A", "Trung bình", INCIDENT_STATES.PENDING, "09:21", "Thời gian nạp khí tăng", 0.71],
    ["SC-021", "APU-20", "D", "Trung bình", INCIDENT_STATES.PROCESSING, "09:12", "Áp suất hệ thống dao động", 0.69],
    ["SC-020", "APU-12", "B", "Trung bình", INCIDENT_STATES.NEW, "09:05", "Chu kỳ máy nén thay đổi", 0.65],
  ];

  return rawData.map(([id, machine, line, risk, state, time, title, score]) => {
    const incident = {
      id, machine, line, risk, state, time, title, score,
      action: DEFAULT_ACTION,
      note: "",
      progress: 0,
      history: [],
    };

    // Tạo lịch sử mẫu giả lập theo trạng thái
    appendHistory(incident, time, "Hệ thống · mẫu", "Phát hiện bất thường từ dữ liệu cảm biến");

    if (state !== INCIDENT_STATES.NEW) {
      appendHistory(incident, time, "Trợ lý AI · mẫu", "Tổng hợp tín hiệu và tra cứu tài liệu");
    }
    if ([INCIDENT_STATES.PENDING, INCIDENT_STATES.PROCESSING].includes(state)) {
      appendHistory(incident, time, "Trợ lý AI · mẫu", "Gửi đề xuất kiểm tra cho trưởng ca");
    }
    if (state === INCIDENT_STATES.PROCESSING) {
      appendHistory(incident, "09:18", "Nguyễn An · mẫu", "Duyệt đề xuất và giao kỹ thuật viên");
    }

    return incident;
  });
}

// Các hàm Helper nội bộ
function requireState(incident, allowedStates) {
  if (!allowedStates.includes(incident.state)) {
    throw new Error("Trạng thái sự cố không cho phép thao tác này.");
  }
}

function appendHistory(incident, time, actor, text) {
  incident.history.push({ time, actor, text });
}

function recordInteraction(incident, text, actor = "Nguyễn An · demo") {
  const currentTime = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  appendHistory(incident, currentTime, actor, text);
}

// Cỗ máy chuyển đổi trạng thái (State Machine)
export function transitionIncident(incident, event, payload = {}) {
  const note = (payload.note || "").trim();

  switch (event) {
    case "analyze":
      requireState(incident, [INCIDENT_STATES.NEW, INCIDENT_STATES.ANALYZING]);
      incident.state = INCIDENT_STATES.PENDING;
      recordInteraction(incident, "Hoàn tất phân tích minh họa; gửi đề xuất kiểm tra", "Trợ lý AI · demo");
      break;

    case "approve":
    case "reject":
    case "edit":
      requireState(incident, [INCIDENT_STATES.PENDING]);
      
      if (event !== "approve" && !note) throw new Error("Nhập lý do khi từ chối hoặc chỉnh sửa.");
      if (event === "edit" && !payload.action?.trim()) throw new Error("Phương án không được để trống.");
      
      incident.note = note;
      
      if (event === "edit") {
        incident.action = payload.action.trim();
        recordInteraction(incident, `Chỉnh sửa đề xuất: ${incident.action}. Lý do: ${note}`);
      } else {
        incident.state = event === "approve" ? INCIDENT_STATES.PROCESSING : INCIDENT_STATES.ANALYZING;
        const logMsg = event === "approve" ? "Duyệt đề xuất; giao kỹ thuật viên" : "Từ chối đề xuất";
        recordInteraction(incident, `${logMsg}. ${note}`);
      }
      break;

    case "start":
      requireState(incident, [INCIDENT_STATES.PROCESSING]);
      incident.state = INCIDENT_STATES.MONITORING;
      incident.progress = 0;
      recordInteraction(incident, "Xác nhận đã thực hiện; bắt đầu theo dõi 20 phút", "Trần Minh · demo");
      break;

    case "advance":
      requireState(incident, [INCIDENT_STATES.MONITORING]);
      incident.progress = Math.min(20, incident.progress + 5);
      break;

    case "close":
    case "reanalyze":
      requireState(incident, [INCIDENT_STATES.MONITORING]);
      if (incident.progress < 20) throw new Error("Cần hoàn tất cửa sổ theo dõi trước khi kết luận.");
      
      incident.state = event === "close" ? INCIDENT_STATES.CLOSED : INCIDENT_STATES.ANALYZING;
      const resultMsg = event === "close" 
        ? "Xác nhận ổn định sau 20 phút mô phỏng; đóng sự cố" 
        : "Vẫn bất thường sau xử lý; yêu cầu phân tích lại";
      
      recordInteraction(incident, resultMsg, "Trần Minh · demo");
      if (event === "reanalyze") incident.progress = 0;
      break;

    default:
      throw new Error("Thao tác không hợp lệ.");
  }
}