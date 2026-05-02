import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel


class AiAnalysisRead(BaseModel):
    id: uuid.UUID
    period_key: str
    analysis_text: str
    model_used: str
    token_usage: Optional[Dict[str, Any]] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AiAnalysisNotFound(BaseModel):
    exists: bool = False
    period_key: str
    message: str = "No analysis found for this period"
