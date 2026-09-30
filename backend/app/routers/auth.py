
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from jose import jwt, JWTError

from app.database import get_db
from app.models import Player
from app.schemas import (
    PlayerRegister,
    PlayerLogin,
    PlayerResponse,
    TokenResponse
)
from app.security import (
    hash_password,
    verify_password,
    create_access_token,
    SECRET_KEY,
    ALGORITHM
)

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

bearer_scheme = HTTPBearer()


# REGISTER PLAYER
@router.post(
    "/register",
    response_model=PlayerResponse,
    status_code=201
)
def register_player(
    data: PlayerRegister,
    db: Session = Depends(get_db)
):
    player = Player(
        username=data.username,
        email=data.email,
        password=hash_password(data.password),
        total_gems=0
    )

    db.add(player)

    try:
        db.commit()
        db.refresh(player)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Username or email already exists"
        )

    return player


# LOGIN PLAYER
@router.post(
    "/login",
    response_model=TokenResponse
)
def login_player(
    data: PlayerLogin,
    db: Session = Depends(get_db)
):
    player = db.query(Player).filter(
        Player.username == data.username
    ).first()

    if not player or not verify_password(
        data.password,
        player.password
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    access_token = create_access_token({
        "sub": str(player.id)
    })

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "player": player
    }


# GET LOGGED-IN PLAYER
@router.get(
    "/me",
    response_model=PlayerResponse
)
def get_current_player(
    credentials: HTTPAuthorizationCredentials = Depends(
        bearer_scheme
    ),
    db: Session = Depends(get_db)
):
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
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