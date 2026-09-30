import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.database import engine, Base
from app import models
from app.routers import auth, scores, leaderboard, achievements
from app.routers import missions

app = FastAPI(title="Flying Bird Game API")

frontend_url = os.getenv(
    "FRONTEND_URL",
    "http://localhost:5173"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        frontend_url,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

app.include_router(auth.router)
app.include_router(scores.router)
app.include_router(leaderboard.router)
app.include_router(achievements.router)
app.include_router(missions.router)

@app.get("/")
def root():
    return {"message": "Flying Bird Game API is running"}

@app.get("/db-test")
def db_test():
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))

    return {"database": "connected"}