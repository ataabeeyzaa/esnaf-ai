import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.agents.orchestrator import get_orchestrator
from app.db import get_db
from app.models import ChatLog
from app.schemas import ChatRequest, ChatResponse


router = APIRouter(prefix="/chat", tags=["chat"])
logger = logging.getLogger(__name__)


def _log_turn(db: Session, audience: str, user_msg: str, reply: str, tools_used: list) -> None:
    db.add(ChatLog(role="user", audience=audience, content=user_msg))
    tool_names = ",".join(t.get("name", "") for t in tools_used)
    db.add(ChatLog(role="assistant", audience=audience, content=reply, tool_name=tool_names))
    db.commit()


@router.post("/customer", response_model=ChatResponse)
def chat_customer(req: ChatRequest, db: Session = Depends(get_db)) -> ChatResponse:
    """Müşteri kanalı — WhatsApp/web chat müşteri mesajı."""
    try:
        agent = get_orchestrator()
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    extra = None
    if req.customer_phone:
        extra = f"Bu mesajı yazan müşteri, telefon numarası: {req.customer_phone}. Sipariş sorgularında bu telefonu doğrulama için kullan."

    result = agent.chat(
        message=req.message,
        audience="customer",
        history=req.history,
        extra_context=extra,
        customer_phone=req.customer_phone,
        force_fast=req.fast_mode,
    )
    _log_turn(db, "customer", req.message, result["reply"], result["tools_used"])
    return ChatResponse(
        reply=result["reply"],
        tools_used=result["tools_used"],
        fallback=result.get("fallback"),
        model_used=result.get("model_used"),
    )


@router.post("/owner", response_model=ChatResponse)
def chat_owner(req: ChatRequest, db: Session = Depends(get_db)) -> ChatResponse:
    """İşletmeci kanalı — dashboard içi AI asistan."""
    try:
        agent = get_orchestrator()
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    result = agent.chat(
        message=req.message,
        audience="owner",
        history=req.history,
        force_fast=req.fast_mode,
    )
    _log_turn(db, "owner", req.message, result["reply"], result["tools_used"])
    return ChatResponse(
        reply=result["reply"],
        tools_used=result["tools_used"],
        fallback=result.get("fallback"),
        model_used=result.get("model_used"),
    )
