from datetime import date

from pydantic import BaseModel


class StudyPlanGenerateRequest(BaseModel):
    exam_date: date
    subjects: list[dict]
    available_hours_per_day: float
