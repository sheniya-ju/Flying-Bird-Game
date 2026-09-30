from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    func,
)

from sqlalchemy.orm import relationship

from app.database import Base


# 1. Players table
class Player(Base):
    __tablename__ = "players"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    username = Column(
        String(50),
        unique=True,
        nullable=False,
        index=True
    )

    email = Column(
        String(100),
        unique=True,
        nullable=False,
        index=True
    )

    password = Column(
        String(255),
        nullable=False
    )

    total_gems = Column(
        Integer,
        default=0,
        nullable=False
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    # Relationships
    scores = relationship(
        "GameScore",
        back_populates="player",
        cascade="all, delete-orphan"
    )

    achievements = relationship(
        "PlayerAchievement",
        back_populates="player",
        cascade="all, delete-orphan"
    )


# 2. Game Scores table
class GameScore(Base):
    __tablename__ = "game_scores"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    player_id = Column(
        Integer,
        ForeignKey("players.id"),
        nullable=False,
        index=True
    )

    score = Column(
        Integer,
        default=0,
        nullable=False
    )

    level = Column(
        Integer,
        default=1,
        nullable=False
    )

    gems_collected = Column(
        Integer,
        default=0,
        nullable=False
    )

    obstacles_passed = Column(
        Integer,
        default=0,
        nullable=False
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    # Relationship
    player = relationship(
        "Player",
        back_populates="scores"
    )


# 3. Achievements table
class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String(100),
        unique=True,
        nullable=False
    )

    description = Column(
        String(255),
        nullable=False
    )

    target = Column(
        Integer,
        nullable=False
    )

    reward_gems = Column(
        Integer,
        default=0,
        nullable=False
    )

    # Relationship
    player_achievements = relationship(
        "PlayerAchievement",
        back_populates="achievement",
        cascade="all, delete-orphan"
    )


# 4. Player Achievements table
class PlayerAchievement(Base):
    __tablename__ = "player_achievements"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    player_id = Column(
        Integer,
        ForeignKey("players.id"),
        nullable=False
    )

    achievement_id = Column(
        Integer,
        ForeignKey("achievements.id"),
        nullable=False
    )

    progress = Column(
        Integer,
        default=0,
        nullable=False
    )

    is_completed = Column(
        Boolean,
        default=False,
        nullable=False
    )

    # Relationships
    player = relationship(
        "Player",
        back_populates="achievements"
    )

    achievement = relationship(
        "Achievement",
        back_populates="player_achievements"
    )

    # Prevent duplicate achievements for the same player
    __table_args__ = (
        UniqueConstraint(
            "player_id",
            "achievement_id",
            name="unique_player_achievement"
        ),
    )

