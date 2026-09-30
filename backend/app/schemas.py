
from pydantic import BaseModel, Field, ConfigDict


class PlayerRegister(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: str = Field(min_length=5, max_length=100)
    password: str = Field(min_length=8, max_length=128)


class PlayerLogin(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=1, max_length=128)


class PlayerResponse(BaseModel):
    id: int
    username: str
    email: str
    total_gems: int

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    player: PlayerResponse