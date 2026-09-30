from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import Column, Date, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import Base, get_db
from app.models import GameScore, Player
from app.security import get_current_player

router = APIRouter(prefix="/missions", tags=["Daily Missions"])


class DailyMissionClaim(Base):
    __tablename__ = "daily_mission_claims"
    __table_args__ = (
        UniqueConstraint("player_id", "mission_id", "claim_date", name="uq_daily_mission_claim"),
    )

    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("players.id", ondelete="CASCADE"), nullable=False, index=True)
    mission_id = Column(String(50), nullable=False, index=True)
    claim_date = Column(Date, nullable=False, index=True)
    reward_gems = Column(Integer, nullable=False)


MISSIONS = {
    "mission-play": {"target": 1, "reward": 5},
    "mission-gems": {"target": 10, "reward": 10},
    "mission-score": {"target": 20, "reward": 15},
}


def get_progress(db: Session, player: Player, mission_id: str) -> int:
    if mission_id == "mission-play":
        return db.query(GameScore).filter(GameScore.player_id == player.id).count()

    if mission_id == "mission-gems":
        return int(player.total_gems or 0)

    if mission_id == "mission-score":
        return int(
            db.query(func.max(GameScore.score))
            .filter(GameScore.player_id == player.id)
            .scalar()
            or 0
        )

    raise HTTPException(status_code=404, detail="Unknown mission")


@router.get("/")
def get_missions(
    player: Player = Depends(get_current_player),
    db: Session = Depends(get_db),
):
    today = date.today()
    result = []

    for mission_id, config in MISSIONS.items():
        progress = get_progress(db, player, mission_id)
        claim = (
            db.query(DailyMissionClaim)
            .filter(
                DailyMissionClaim.player_id == player.id,
                DailyMissionClaim.mission_id == mission_id,
                DailyMissionClaim.claim_date == today,
            )
            .first()
        )
        result.append(
            {
                "id": mission_id,
                "progress": min(progress, config["target"]),
                "target": config["target"],
                "reward": config["reward"],
                "completed": progress >= config["target"],
                "claimed": claim is not None,
            }
        )

    return {"missions": result}


@router.post("/{mission_id}/claim")
def claim_mission(
    mission_id: str,
    player: Player = Depends(get_current_player),
    db: Session = Depends(get_db),
):
    config = MISSIONS.get(mission_id)
    if not config:
        raise HTTPException(status_code=404, detail="Unknown mission")

    today = date.today()
    existing = (
        db.query(DailyMissionClaim)
        .filter(
            DailyMissionClaim.player_id == player.id,
            DailyMissionClaim.mission_id == mission_id,
            DailyMissionClaim.claim_date == today,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="This mission has already been claimed today.")

    progress = get_progress(db, player, mission_id)
    if progress < config["target"]:
        raise HTTPException(status_code=400, detail="Complete the mission before claiming its reward.")

    claim = DailyMissionClaim(
        player_id=player.id,
        mission_id=mission_id,
        claim_date=today,
        reward_gems=config["reward"],
    )
    db.add(claim)
    player.total_gems = int(player.total_gems or 0) + config["reward"]

    try:
        db.commit()
        db.refresh(claim)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="This mission has already been claimed today.")

    return {
        "message": "Mission reward claimed",
        "mission_id": mission_id,
        "reward_gems": config["reward"],
        "total_gems": player.total_gems,
        "claim_date": today.isoformat(),
    }
