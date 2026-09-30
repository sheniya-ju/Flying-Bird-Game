from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import Player, GameScore

router = APIRouter(
    prefix="/leaderboard",
    tags=["Leaderboard"]
)


@router.get("/")
def get_leaderboard(db: Session = Depends(get_db)):

    results = (
        db.query(
            Player.id,
            Player.username,
            func.max(GameScore.score).label("best_score"),
            func.max(GameScore.level).label("highest_level")
        )
        .join(GameScore, GameScore.player_id == Player.id)
        .group_by(Player.id, Player.username)
        .order_by(
    func.max(GameScore.score).desc(),
    func.max(GameScore.level).desc(),
    Player.username.asc()
)
        .limit(10)
        .all()
    )

    leaderboard = []

    for rank, player in enumerate(results, start=1):
        leaderboard.append({
            "rank": rank,
            "player_id": player.id,
            "username": player.username,
            "best_score": player.best_score,
            "highest_level": player.highest_level
        })

    return {
        "leaderboard": leaderboard
    }