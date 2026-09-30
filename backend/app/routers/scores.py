from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from pydantic import BaseModel, Field

from app.database import get_db
from app.models import Player, GameScore
from app.security import SECRET_KEY, ALGORITHM

router = APIRouter(
    prefix="/scores",
    tags=["Game Scores"]
)

bearer_scheme = HTTPBearer()


# Request schema
class ScoreCreate(BaseModel):
    score: int = Field(ge=0)
    level: int = Field(ge=1)
    gems_collected: int = Field(ge=0)
    obstacles_passed: int = Field(ge=0)


# Get logged-in player
def get_current_player(
    credentials: HTTPAuthorizationCredentials = Depends(
        bearer_scheme
    ),
    db: Session = Depends(get_db)
):
    try:
        payload = jwt.decode(
            credentials.credentials,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        player_id = int(payload.get("sub"))

    except (JWTError, TypeError, ValueError):
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

    player = db.query(Player).filter(
        Player.id == player_id
    ).first()

    if not player:
        raise HTTPException(
            status_code=401,
            detail="Player not found"
        )

    return player


# Save game score
@router.post("/save")
def save_score(
    data: ScoreCreate,
    player: Player = Depends(get_current_player),
    db: Session = Depends(get_db)
):
    game_score = GameScore(
        player_id=player.id,
        score=data.score,
        level=data.level,
        gems_collected=data.gems_collected,
        obstacles_passed=data.obstacles_passed
    )

    db.add(game_score)

    # Update player's total gems
    player.total_gems += data.gems_collected

    db.commit()
    db.refresh(game_score)

    return {
        "message": "Score saved successfully",
        "score_id": game_score.id,
        "score": game_score.score,
        "level": game_score.level,
        "gems_collected": game_score.gems_collected,
        "total_gems": player.total_gems
    }


# Get logged-in player's score history
@router.get("/my-scores")
def get_my_scores(
    player: Player = Depends(get_current_player),
    db: Session = Depends(get_db)
):
    scores = db.query(GameScore).filter(
        GameScore.player_id == player.id
    ).order_by(
        GameScore.created_at.desc()
    ).all()

    return scores


# Get player's best score
@router.get("/my-best")
def get_my_best(
    player: Player = Depends(get_current_player),
    db: Session = Depends(get_db)
):
    best_score = db.query(GameScore).filter(
        GameScore.player_id == player.id
    ).order_by(
        GameScore.score.desc()
    ).first()

    if not best_score:
        return {
            "message": "No scores recorded yet",
            "best_score": 0
        }

    return {
        "best_score": best_score.score,
        "level": best_score.level,
        "gems_collected": best_score.gems_collected
    }
