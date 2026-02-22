from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import UUID


@dataclass
class ProcessingStatus:
    unit_id: UUID
    status: str  # "processing", "completed", "failed"
    started_at: datetime
    completed_at: datetime | None = None
    error: str | None = None


class ProcessingTracker:
    def __init__(self) -> None:
        self._statuses: dict[UUID, ProcessingStatus] = {}

    def start(self, unit_id: UUID) -> None:
        self._statuses[unit_id] = ProcessingStatus(
            unit_id=unit_id,
            status="processing",
            started_at=datetime.now(timezone.utc),
        )

    def complete(self, unit_id: UUID) -> None:
        if unit_id in self._statuses:
            self._statuses[unit_id].status = "completed"
            self._statuses[unit_id].completed_at = datetime.now(timezone.utc)

    def fail(self, unit_id: UUID, error: str) -> None:
        if unit_id in self._statuses:
            self._statuses[unit_id].status = "failed"
            self._statuses[unit_id].error = error
            self._statuses[unit_id].completed_at = datetime.now(timezone.utc)

    def get_status(self, unit_id: UUID) -> ProcessingStatus | None:
        return self._statuses.get(unit_id)

    def is_processing(self, unit_id: UUID) -> bool:
        status = self._statuses.get(unit_id)
        return status is not None and status.status == "processing"

    def clear(self, unit_id: UUID) -> None:
        self._statuses.pop(unit_id, None)
