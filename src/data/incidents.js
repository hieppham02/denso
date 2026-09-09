const defaultAction =
  "Kiểm tra xác nhận dấu hiệu rò khí theo quy trình bảo trì đã phê duyệt; ghi lại kết quả kiểm tra trước khi quyết định can thiệp.";
export const incidentStates = [
  "Mới",
  "Đang phân tích",
  "Chờ duyệt",
  "Đang xử lý",
  "Đang theo dõi",
  "Đã đóng",
];
export function createIncidents() {
  return [
    [
      "SC-024",
      "APU-09",
      "B",
      "Cao",
      "Chờ duyệt",
      "09:42",
      "Áp suất tụt nhanh, chu kỳ nén dày",
      0.82,
    ],
    [
      "SC-023",
      "APU-16",
      "C",
      "Cao",
      "Đang phân tích",
      "09:35",
      "Tín hiệu vận hành bất thường kéo dài",
      0.78,
    ],
    [
      "SC-022",
      "APU-04",
      "A",
      "Trung bình",
      "Chờ duyệt",
      "09:21",
      "Thời gian nạp khí tăng",
      0.71,
    ],
    [
      "SC-021",
      "APU-20",
      "D",
      "Trung bình",
      "Đang xử lý",
      "09:12",
      "Áp suất hệ thống dao động",
      0.69,
    ],
    [
      "SC-020",
      "APU-12",
      "B",
      "Trung bình",
      "Mới",
      "09:05",
      "Chu kỳ máy nén thay đổi",
      0.65,
    ],
  ].map(([id, machine, line, risk, state, time, title, score]) => {
    const incident = {
      id,
      machine,
      line,
      risk,
      state,
      time,
      title,
      score,
      action: defaultAction,
      note: "",
      progress: 0,
      history: [],
    };
    incident.history.push({
      time,
      actor: "Hệ thống · mẫu",
      text: "Phát hiện bất thường từ dữ liệu cảm biến",
    });
    if (state !== "Mới")
      incident.history.push({
        time,
        actor: "Trợ lý AI · mẫu",
        text: "Tổng hợp tín hiệu và tra cứu tài liệu",
      });
    if (["Chờ duyệt", "Đang xử lý"].includes(state))
      incident.history.push({
        time,
        actor: "Trợ lý AI · mẫu",
        text: "Gửi đề xuất kiểm tra cho trưởng ca",
      });
    if (state === "Đang xử lý")
      incident.history.push({
        time: "09:18",
        actor: "Nguyễn An · mẫu",
        text: "Duyệt đề xuất và giao kỹ thuật viên",
      });
    return incident;
  });
}
function requireState(incident, states) {
  if (!states.includes(incident.state))
    throw new Error("Trạng thái sự cố không cho phép thao tác này.");
}
function record(incident, text, actor = "Nguyễn An · demo") {
  incident.history.push({
    time: new Date().toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    actor,
    text,
  });
}
export function transitionIncident(incident, event, payload = {}) {
  const note = (payload.note || "").trim();
  if (event === "analyze") {
    requireState(incident, ["Mới", "Đang phân tích"]);
    incident.state = "Chờ duyệt";
    record(
      incident,
      "Hoàn tất phân tích minh họa; gửi đề xuất kiểm tra",
      "Trợ lý AI · demo",
    );
  } else if (["approve", "reject", "edit"].includes(event)) {
    requireState(incident, ["Chờ duyệt"]);
    if (event !== "approve" && !note)
      throw new Error("Nhập lý do khi từ chối hoặc chỉnh sửa.");
    if (event === "edit" && !payload.action?.trim())
      throw new Error("Phương án không được để trống.");
    incident.note = note;
    if (event === "edit") {
      incident.action = payload.action.trim();
      record(incident, `Chỉnh sửa đề xuất: ${incident.action}. Lý do: ${note}`);
    } else {
      incident.state = event === "approve" ? "Đang xử lý" : "Đang phân tích";
      record(
        incident,
        `${event === "approve" ? "Duyệt đề xuất; giao kỹ thuật viên" : "Từ chối đề xuất"}. ${note}`,
      );
    }
  } else if (event === "start") {
    requireState(incident, ["Đang xử lý"]);
    incident.state = "Đang theo dõi";
    incident.progress = 0;
    record(
      incident,
      "Xác nhận đã thực hiện; bắt đầu theo dõi 20 phút",
      "Trần Minh · demo",
    );
  } else if (event === "advance") {
    requireState(incident, ["Đang theo dõi"]);
    incident.progress = Math.min(20, incident.progress + 5);
  } else if (["close", "reanalyze"].includes(event)) {
    requireState(incident, ["Đang theo dõi"]);
    if (incident.progress < 20)
      throw new Error("Cần hoàn tất cửa sổ theo dõi trước khi kết luận.");
    incident.state = event === "close" ? "Đã đóng" : "Đang phân tích";
    record(
      incident,
      event === "close"
        ? "Xác nhận ổn định sau 20 phút mô phỏng; đóng sự cố"
        : "Vẫn bất thường sau xử lý; yêu cầu phân tích lại",
      "Trần Minh · demo",
    );
    if (event === "reanalyze") incident.progress = 0;
  } else throw new Error("Thao tác không hợp lệ.");
}
