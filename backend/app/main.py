from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Literal

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi import WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field
from app.storage.csv_store import MetroPT3CsvStore


SIMULATION_DURATION = 900
LINES = "ABCD"
INCIDENT_STATES = {
    "NEW": "Mới",
    "ANALYZING": "Đang phân tích",
    "PENDING": "Chờ phê duyệt",
    "PROCESSING": "Đang xử lý",
    "MONITORING": "Đang theo dõi",
    "CLOSED": "Đã đóng",
}


class Device(BaseModel):
    id: str
    line: str
    source_type: Literal["real", "simulated"] = "real"
    source_device_id: str | None = None
    available: bool = True


class AuditEvent(BaseModel):
    text: str
    time: str
    actor: str


class SensorSample(BaseModel):
    time: int
    timestamp: datetime
    TP2: float
    TP3: float
    H1: float
    DV_pressure: float
    Reservoirs: float
    Oil_temperature: float
    Motor_current: float
    COMP: int
    DV_eletric: int
    Towers: int
    MPG: int
    LPS: int
    Pressure_switch: int
    Oil_level: int
    Caudal_impulses: int
    loaded: bool


class Incident(BaseModel):
    id: str
    machine: str
    line: str
    title: str
    risk: Literal["Cao", "Trung bình", "Thấp"]
    state: str
    score: int
    action: str = "Kiểm tra hệ thống khí nén"
    note: str = ""
    progress: int = 0
    time: str = "09:00"
    history: list[AuditEvent] = Field(default_factory=list)


class TransitionRequest(BaseModel):
    event: Literal["analyze", "approve", "reject", "edit", "start", "advance", "close", "reanalyze"]
    note: str = ""
    action: str = ""


class SimulationTickRequest(BaseModel):
    scenario: Literal["normal", "leak"] = "normal"
    playback_speed: Literal[1, 2, 5, 10] = Field(default=1, alias="playbackSpeed")


class SimulationSession(BaseModel):
    device_id: str
    scenario: Literal["normal", "leak"] = "normal"
    elapsed: int = 0
    samples: list[SensorSample] = Field(default_factory=list)
    data_source: str = "MetroPT3(AirCompressor).csv"


app = FastAPI(
    title="FactoryDoctor API",
    version="0.1.0",
    description="API boundary for the FactoryDoctor predictive-maintenance demo.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


DEVICES = [
    Device(
        id="APU-01",
        line="A",
        source_type="real",
        source_device_id="metropt-3-apu",
    )
]

INCIDENTS: dict[str, Incident] = {
    "SC-024": Incident(
        id="SC-024", machine="APU-01", line="A", title="Áp suất giảm bất thường",
        risk="Cao", state="PENDING", score=92,
    ),
}
SESSIONS: dict[str, SimulationSession] = {}
REPLAY_CURSORS: dict[str, int] = {}
CSV_STORE = MetroPT3CsvStore()

for incident in INCIDENTS.values():
    incident.history = [AuditEvent(text="Phát hiện tín hiệu bất thường", time=incident.time, actor="FactoryDoctor")]


def device_exists(device_id: str) -> None:
    if not any(device.id == device_id for device in DEVICES):
        raise HTTPException(status_code=404, detail=f"Unknown device: {device_id}")


def transition_incident(incident: Incident, request: TransitionRequest) -> Incident:
    state = incident.state
    event = request.event
    transitions = {
        ("NEW", "analyze"): "PENDING",
        ("ANALYZING", "analyze"): "PENDING",
        ("PENDING", "approve"): "PROCESSING",
        ("PENDING", "reject"): "ANALYZING",
        ("PENDING", "edit"): "PENDING",
        ("PROCESSING", "start"): "MONITORING",
        ("MONITORING", "close"): "CLOSED",
        ("MONITORING", "reanalyze"): "ANALYZING",
    }
    if event in {"reject", "edit"} and not request.note.strip():
        raise HTTPException(status_code=422, detail="A note is required for reject/edit")
    if event == "edit" and not request.action.strip():
        raise HTTPException(status_code=422, detail="An action is required for edit")
    if event == "advance":
        if state != "MONITORING":
            raise HTTPException(status_code=409, detail="Incident is not in monitoring")
        incident.progress = min(20, incident.progress + 5)
        return incident
    if event == "close" and incident.progress < 20:
        raise HTTPException(status_code=409, detail="Complete the monitoring window before closing")
    next_state = transitions.get((state, event))
    if next_state is None:
        raise HTTPException(status_code=409, detail=f"Invalid transition: {state} -> {event}")
    incident.state = next_state
    if request.note:
        incident.note = request.note
    if request.action:
        incident.action = request.action
    if next_state == "MONITORING":
        incident.progress = 0
    if next_state == "ANALYZING":
        incident.progress = 0
    incident.history.append(
        AuditEvent(
            text=f"Chuyển trạng thái: {state} → {next_state}",
            time=datetime.now(timezone.utc).strftime("%H:%M"),
            actor="Nguyễn An",
        )
    )
    return incident


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "factorydoctor-api", "version": app.version}


@app.get("/api/devices", response_model=list[Device])
def list_devices() -> list[Device]:
    return DEVICES


@app.get("/api/devices/{device_id}/history", response_model=list[SensorSample])
def device_history(
    device_id: str,
    minutes: int = Query(default=60, ge=1, le=120),
    incident: bool = False,
) -> list[SensorSample]:
    device_exists(device_id)
    if device_id == "APU-01":
        try:
            return CSV_STORE.history(minutes, incident=incident)
        except (FileNotFoundError, ValueError) as error:
            raise HTTPException(status_code=503, detail=str(error)) from error
    raise HTTPException(status_code=404, detail=f"No real data for device: {device_id}")


@app.get("/api/incidents", response_model=list[Incident])
def list_incidents(state: str | None = None) -> list[Incident]:
    incidents = list(INCIDENTS.values())
    return [incident for incident in incidents if state is None or incident.state == state]


@app.get("/api/incidents/{incident_id}", response_model=Incident)
def get_incident(incident_id: str) -> Incident:
    incident = INCIDENTS.get(incident_id)
    if incident is None:
        raise HTTPException(status_code=404, detail=f"Unknown incident: {incident_id}")
    return incident


@app.post("/api/incidents/{incident_id}/transition", response_model=Incident)
def change_incident(incident_id: str, request: TransitionRequest) -> Incident:
    incident = INCIDENTS.get(incident_id)
    if incident is None:
        raise HTTPException(status_code=404, detail=f"Unknown incident: {incident_id}")
    return transition_incident(incident, request)


def websocket_sample(row: dict, elapsed: int) -> SensorSample:
    return SensorSample(time=elapsed, **row)


def take_stream_row(stream):
    try:
        return next(stream)
    except StopIteration:
        return None


async def next_stream_row(stream):
    return await asyncio.to_thread(take_stream_row, stream)


@app.websocket("/ws/simulation/{device_id}")
async def simulation_socket(websocket: WebSocket, device_id: str) -> None:
    device_exists(device_id)
    await websocket.accept()
    scenario: Literal["normal", "leak"] = "normal"
    running = False
    playback_speed = 1
    elapsed = 0
    stream = CSV_STORE.replay_stream(scenario)
    previous_timestamp: datetime | None = None

    async def reset_stream(next_scenario: Literal["normal", "leak"]):
        nonlocal scenario, stream, elapsed, previous_timestamp, running
        scenario = next_scenario
        stream = CSV_STORE.replay_stream(scenario)
        elapsed = 0
        previous_timestamp = None
        running = False
        first = await next_stream_row(stream)
        if first is None:
            raise ValueError("MetroPT-3 CSV contains no replay samples")
        previous_timestamp = datetime.fromisoformat(first["timestamp"].removesuffix("Z"))
        return websocket_sample(first, elapsed)

    try:
        first = await reset_stream(scenario)
        await websocket.send_json({
            "type": "reset",
            "deviceId": device_id,
            "scenario": scenario,
            "elapsed": elapsed,
            "dataSource": "MetroPT3(AirCompressor).csv",
            "sample": first.model_dump(mode="json"),
        })

        while True:
            try:
                interval = 1.0 / playback_speed if running else 1.0
                message = await asyncio.wait_for(websocket.receive_json(), timeout=interval)
                action = message.get("action", "")
                if action == "start":
                    playback_speed = int(message.get("playbackSpeed", 1))
                    if playback_speed not in {1, 2, 5, 10}:
                        playback_speed = 1
                    running = True
                elif action == "pause":
                    running = False
                elif action == "reset":
                    next_scenario = message.get("scenario", "normal")
                    if next_scenario not in {"normal", "leak"}:
                        next_scenario = "normal"
                    sample = await reset_stream(next_scenario)
                    await websocket.send_json({
                        "type": "reset",
                        "deviceId": device_id,
                        "scenario": scenario,
                        "elapsed": elapsed,
                        "dataSource": "MetroPT3(AirCompressor).csv",
                        "sample": sample.model_dump(mode="json"),
                    })
                continue
            except asyncio.TimeoutError:
                pass

            if not running:
                continue

            samples = []
            row = await next_stream_row(stream)
            if row is None:
                running = False
            else:
                timestamp = datetime.fromisoformat(row["timestamp"].removesuffix("Z"))
                if previous_timestamp is not None:
                    elapsed += max(1, int((timestamp - previous_timestamp).total_seconds()))
                previous_timestamp = timestamp
                samples.append(websocket_sample(row, elapsed).model_dump(mode="json"))

            if samples:
                await websocket.send_json({
                    "type": "samples",
                    "deviceId": device_id,
                    "scenario": scenario,
                    "elapsed": elapsed,
                    "running": running,
                    "samples": samples,
                })
    except (WebSocketDisconnect, ValueError):
        return


@app.post("/api/simulation/{device_id}/reset", response_model=SimulationSession)
def reset_simulation(device_id: str, request: SimulationTickRequest | None = None) -> SimulationSession:
    device_exists(device_id)
    scenario = request.scenario if request else "normal"
    initial = CSV_STORE.replay_reset(scenario)
    REPLAY_CURSORS[device_id] = len(initial)
    SESSIONS[device_id] = SimulationSession(
        device_id=device_id,
        scenario=scenario,
        elapsed=0,
        samples=[SensorSample(**sample) for sample in initial],
    )
    return SESSIONS[device_id]


@app.post("/api/simulation/{device_id}/tick", response_model=SimulationSession)
def tick_simulation(device_id: str, request: SimulationTickRequest) -> SimulationSession:
    device_exists(device_id)
    session = SESSIONS.get(device_id)
    if session is None or session.scenario != request.scenario:
        return reset_simulation(device_id, request)
    session.scenario = request.scenario
    remaining = max(0, SIMULATION_DURATION - session.elapsed)
    steps = min(request.playback_speed, remaining // 60)
    if steps:
        rows, cursor = CSV_STORE.replay_rows(request.scenario, REPLAY_CURSORS.get(device_id, 0), steps)
        REPLAY_CURSORS[device_id] = cursor
        for row in rows:
            session.elapsed += 60
            timestamp = row.pop("timestamp")
            row["time"] = session.elapsed
            row["timestamp"] = timestamp.to_pydatetime().replace(tzinfo=None).isoformat() + "Z"
            session.samples.append(SensorSample(**row))
    session.samples = [
        sample for sample in session.samples
        if sample.time >= session.elapsed - SIMULATION_DURATION
    ]
    return session
