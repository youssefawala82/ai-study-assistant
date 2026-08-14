import json
import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.study_plan import StudyPlan
from app.models.user import User
from app.schemas.study_plan import StudyPlanGenerateRequest
from app.services.llm import chat

router = APIRouter()

PLANNER_SYSTEM_PROMPT = """You are a study planner. You will be given today's actual date, an exam
date, subjects, and available study hours per day. Produce a day-by-day schedule starting from
TODAY'S DATE (given to you below) through the exam date — never invent or guess a different start
date. Respond with ONLY a JSON object (no markdown, no commentary) in this exact shape:
{
  "schedule": [
    {"date": "YYYY-MM-DD", "blocks": [{"subject": "...", "hours": 1.5, "focus": "short description"}]}
  ]
}
Balance time across subjects based on their weights if given, and leave the final day lighter for review.
"""


@router.post("/generate", status_code=201)
def generate_study_plan(
    payload: StudyPlanGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.exam_date <= date.today():
        raise HTTPException(status_code=400, detail="Exam date must be in the future")

    user_prompt = (
        f"Today's date: {date.today().isoformat()}\n"
        f"Exam date: {payload.exam_date}\n"
        f"Available hours per day: {payload.available_hours_per_day}\n"
        f"Subjects: {json.dumps(payload.subjects)}"
    )

    raw = chat(PLANNER_SYSTEM_PROMPT, user_prompt, json_mode=True)

    try:
        parsed = json.loads(raw)
        schedule = parsed["schedule"]
    except (json.JSONDecodeError, KeyError):
        raise HTTPException(status_code=502, detail="The model returned an unexpected format. Try again.")

    plan = StudyPlan(
        user_id=current_user.id,
        exam_date=payload.exam_date,
        subjects=payload.subjects,
        available_hours_per_day=payload.available_hours_per_day,
        generated_schedule=schedule,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)

    return {"id": str(plan.id), "schedule": schedule}


@router.get("")
def list_study_plans(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plans = db.query(StudyPlan).filter(StudyPlan.user_id == current_user.id).order_by(StudyPlan.created_at.desc()).all()
    return [
        {"id": str(p.id), "exam_date": p.exam_date, "created_at": p.created_at}
        for p in plans
    ]


@router.get("/{plan_id}")
def get_study_plan(
    plan_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan = db.get(StudyPlan, plan_id)
    if not plan or plan.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Study plan not found")
    return {
        "id": str(plan.id),
        "exam_date": plan.exam_date,
        "subjects": plan.subjects,
        "available_hours_per_day": float(plan.available_hours_per_day),
        "schedule": plan.generated_schedule,
    }