from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    Player,
    GameScore,
    Achievement,
    PlayerAchievement,
)

# IMPORTANT:
# Replace this import with the actual authentication
# dependency defined in your security.py.
from app.security import get_current_player


router = APIRouter(
    prefix="/achievements",
    tags=["Achievements"],
)


# Default achievements
DEFAULT_ACHIEVEMENTS = [
    {
        "name": "First Flight",
        "description": "Complete your first game.",
        "target": 1,
        "reward_gems": 10,
    },
    {
        "name": "Score Hunter",
        "description": "Reach a score of 50 in a game.",
        "target": 50,
        "reward_gems": 20,
    },
    {
        "name": "Bird Master",
        "description": "Reach a score of 100 in a game.",
        "target": 100,
        "reward_gems": 50,
    },
    {
        "name": "Gem Collector",
        "description": "Collect 100 gems in total.",
        "target": 100,
        "reward_gems": 30,
    },
    {
        "name": "High Flyer",
        "description": "Reach level 5 in a game.",
        "target": 5,
        "reward_gems": 40,
    },
]


def seed_achievements(db: Session):
    """Create default achievements if they do not exist."""

    for item in DEFAULT_ACHIEVEMENTS:
        existing = (
            db.query(Achievement)
            .filter(Achievement.name == item["name"])
            .first()
        )

        if not existing:
            db.add(Achievement(**item))

    db.commit()


def get_player_stats(db: Session, player_id: int):
    """Calculate the player's game statistics."""

    scores = (
        db.query(GameScore)
        .filter(GameScore.player_id == player_id)
        .all()
    )

    player = (
        db.query(Player)
        .filter(Player.id == player_id)
        .first()
    )

    if not player:
        raise HTTPException(
            status_code=404,
            detail="Player not found",
        )

    return {
        "games_played": len(scores),
        "score": max(
            (game.score for game in scores),
            default=0,
        ),
        "level": max(
            (game.level for game in scores),
            default=0,
        ),
        "gems": player.total_gems or 0,
    }


def get_requirement_type(achievement_name: str):
    """Map achievement names to their progress statistic."""

    mapping = {
        "First Flight": "games_played",
        "Score Hunter": "score",
        "Bird Master": "score",
        "Gem Collector": "gems",
        "High Flyer": "level",
    }

    return mapping.get(achievement_name, "score")


def check_achievements(db: Session, player: Player):
    """Unlock earned achievements and award gems once."""

    stats = get_player_stats(db, player.id)

    achievements = db.query(Achievement).all()

    unlocked_records = (
        db.query(PlayerAchievement)
        .filter(
            PlayerAchievement.player_id == player.id
        )
        .all()
    )

    unlocked_ids = {
        record.achievement_id
        for record in unlocked_records
        if record.is_completed
    }

    newly_unlocked = []

    for achievement in achievements:

        requirement_type = get_requirement_type(
            achievement.name
        )

        current_value = stats.get(
            requirement_type,
            0,
        )

        progress = min(
            current_value,
            achievement.target,
        )

        record = next(
            (
                item
                for item in unlocked_records
                if item.achievement_id == achievement.id
            ),
            None,
        )

        # Create a progress record if one does not exist.
        if record is None:
            record = PlayerAchievement(
                player_id=player.id,
                achievement_id=achievement.id,
                progress=progress,
                is_completed=False,
            )
            db.add(record)
            unlocked_records.append(record)

        else:
            record.progress = progress

        # Unlock only once.
        if (
            current_value >= achievement.target
            and achievement.id not in unlocked_ids
        ):
            record.is_completed = True

            player.total_gems += achievement.reward_gems

            unlocked_ids.add(achievement.id)

            newly_unlocked.append({
                "id": achievement.id,
                "name": achievement.name,
                "description": achievement.description,
                "reward_gems": achievement.reward_gems,
            })

    db.commit()
    db.refresh(player)

    return newly_unlocked


@router.post("/seed")
def initialize_achievements(
    db: Session = Depends(get_db),
):
    """Initialize default achievements."""

    seed_achievements(db)

    return {
        "message": "Achievements initialized successfully",
    }


@router.get("/")
def get_all_achievements(
    db: Session = Depends(get_db),
):
    """Get all available achievements."""

    seed_achievements(db)

    achievements = (
        db.query(Achievement)
        .order_by(Achievement.id)
        .all()
    )

    return [
        {
            "id": item.id,
            "name": item.name,
            "description": item.description,
            "target": item.target,
            "reward_gems": item.reward_gems,
        }
        for item in achievements
    ]


@router.get("/my-achievements")
def get_my_achievements(
    db: Session = Depends(get_db),
    current_player: Player = Depends(get_current_player),
):
    """Get achievements and progress for the logged-in player."""

    seed_achievements(db)

    stats = get_player_stats(
        db,
        current_player.id,
    )

    player_records = (
        db.query(PlayerAchievement)
        .filter(
            PlayerAchievement.player_id == current_player.id
        )
        .all()
    )

    records_by_achievement = {
        item.achievement_id: item
        for item in player_records
    }

    achievements = (
        db.query(Achievement)
        .order_by(Achievement.id)
        .all()
    )

    result = []

    for achievement in achievements:

        requirement_type = get_requirement_type(
            achievement.name
        )

        current_value = stats.get(
            requirement_type,
            0,
        )

        record = records_by_achievement.get(
            achievement.id
        )

        result.append({
            "id": achievement.id,
            "name": achievement.name,
            "description": achievement.description,
            "target": achievement.target,
            "progress": min(
                current_value,
                achievement.target,
            ),
            "reward_gems": achievement.reward_gems,
            "is_completed": (
                record.is_completed if record else False
            ),
        })

    return result


@router.post("/check")
def check_my_achievements(
    db: Session = Depends(get_db),
    current_player: Player = Depends(get_current_player),
):
    """Check progress and unlock earned achievements."""

    seed_achievements(db)

    newly_unlocked = check_achievements(
        db,
        current_player,
    )

    return {
        "message": "Achievement check completed",
        "newly_unlocked": newly_unlocked,
        "total_gems": current_player.total_gems,
    }

