
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta
import os

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Player


load_dotenv()


# Password hashing
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)


# JWT configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60


# Extract Bearer token from Authorization header
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/auth/login"
)


# Hash password
def hash_password(password: str):
    return pwd_context.hash(password)


# Verify password
def verify_password(
    plain_password: str,
    hashed_password: str
):
    return pwd_context.verify(
        plain_password,
        hashed_password
    )


# Create JWT access token
def create_access_token(data: dict):
    if not SECRET_KEY:
        raise RuntimeError(
            "JWT_SECRET_KEY is missing from the .env file"
        )

    to_encode = data.copy()

    expire = datetime.utcnow() + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    to_encode.update({"exp": expire})

    return jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )


# Get the currently logged-in player
def get_current_player(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired access token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="JWT_SECRET_KEY is not configured"
        )

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        # The login endpoint should put the player's
        # identifier in the "sub" field.
        subject = payload.get("sub")

        if subject is None:
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    # Support tokens whose subject is either a player ID,
    # email address, or username.
    player = None

    if isinstance(subject, str):
        if subject.isdigit():
            player = (
                db.query(Player)
                .filter(Player.id == int(subject))
                .first()
            )

        if player is None:
            player = (
                db.query(Player)
                .filter(
                    (Player.email == subject) |
                    (Player.username == subject)
                )
                .first()
            )

    if player is None:
        raise credentials_exception

    return player