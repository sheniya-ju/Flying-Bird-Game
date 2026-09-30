🐦 Flying Bird Game

A responsive browser-based flying bird game built with React, TypeScript, HTML Canvas, FastAPI, SQLAlchemy, and PostgreSQL.

The game includes multiple levels, bird customization, animated worlds, gems, power-ups, achievements, daily rewards, authentication, online scores, and a global leaderboard.

🌐 Live Demo

Frontend: https://flying-bird-game.onrender.com

Backend: https://flying-bird-backend.onrender.com

✨ Features

🔐 Player registration and JWT login

🎮 50 progressive game levels

🐦 Multiple bird designs

🌍 Multiple animated worlds

🏆 Global online leaderboard

📊 Player statistics and best scores

💎 Gem collection system

⚡ Shield, Slow Motion, Magnet and Double Gems power-ups

🏅 Achievements

🎁 Daily login rewards

🎯 Daily missions

⏸️ Pause and resume

🔊 Sound effects

📱 Responsive UI for desktop, tablet and mobile

🖥️ Full-screen responsive Canvas gameplay

🚀 Frontend and backend deployed separately on Render

🛠️ Technologies Used

Frontend

Technology

Purpose

React

UI and application state

TypeScript

Static typing and safer development

HTML Canvas

Real-time game rendering

CSS

Responsive layout, styling and animations

Vite

Development and production build

Backend

Technology

Purpose

Python

Backend programming

FastAPI

REST API development

SQLAlchemy

ORM/database operations

PostgreSQL

Persistent game data

JWT

Authentication

Uvicorn

FastAPI application server

Deployment

Render Static Site — frontend

Render Web Service — backend

PostgreSQL — database

🎮 How the Game Works

The game uses HTML Canvas for real-time rendering and requestAnimationFrame() for the game loop.

Each frame updates:

Bird physics

Bird position

Obstacles

Gems

Collision detection

Score

Animated background

Finish gate

Level completion

🐦 Bird Physics

const gravity = 0.24;
const jump = -6;

Gravity increases the bird's velocity:

velocity = Math.min(
  velocity + gravity,
  7
);

birdY += velocity;

When the player jumps:

velocity = jump;

The negative velocity moves the bird upward.

🚧 Difficulty System

Difficulty is based on the selected level:

const difficulty = selectedLevel - 1;

Obstacle speed increases gradually:

const speed = Math.min(
  3.6 + difficulty * 0.075,
  7.25
);

The gap between obstacles decreases with level:

const gap = Math.max(
  205,
  285 - difficulty * 1.25
);

The target score increases with level:

const targetScore = 8 + difficulty * 2;

There is no fixed game duration; a level finishes when its objective is reached and the finish gate is passed.

🎨 Animated Canvas Background

The background is generated directly with the Canvas API rather than using a static background image.

It includes:

Linear and radial gradients

Animated clouds

Stars and sparkles

Mountains

Fireflies

Ocean waves

Sun/moon effects

Parallax-style movement

Available worlds:

🌌 Fantasy

🌅 Sunset

🌲 Forest

🌊 Ocean

🏆 Global Leaderboard

The frontend requests leaderboard data from the FastAPI backend through:

GET /leaderboard/

The leaderboard automatically refreshes every 30 seconds and also has a manual refresh button.

🔐 Authentication

JWT authentication is used for login sessions.

The frontend sends the access token to protected endpoints using:

Authorization: Bearer <token>

💎 Gems and Power-Ups

Power-up

Effect

🛡️ Shield

Protects against a collision

🐌 Slow Motion

Reduces obstacle speed

🧲 Magnet

Pulls nearby gems toward the bird

✨ Double Gems

Increases gem rewards

🎁 Daily Rewards and Missions

The dashboard includes a daily login reward. The current implementation checks the saved claim date and allows one reward per calendar day.

Daily missions include goals such as:

Taking a flight

Collecting gems

Reaching a target score

🏅 Achievements

The game tracks milestones including:

First Flight

Gem Collector

Sky Veteran

Level Master

📱 Responsive Design

The UI adapts to:

Desktop

Laptop

Tablet

Mobile

Small screens

Landscape mobile screens

CSS media queries adjust cards, grids, buttons, controls and the Canvas game area.

📁 Project Structure

Flying-Bird-Game/
│
├── src/
│   ├── App.tsx
│   ├── App.css
│   └── main.tsx
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── database.py
│   │   ├── security.py
│   │   └── routers/
│   └── requirements.txt
│
├── public/
├── package.json
├── vite.config.ts
└── README.md

🚀 Run Frontend Locally

Clone the repository:

git clone https://github.com/sheniya-ju/Flying-Bird-Game.git
cd Flying-Bird-Game

Install dependencies:

npm install

Create a local .env file:

VITE_API_URL=http://127.0.0.1:8000

Start the frontend:

npm run dev

Frontend:

http://localhost:5173

🚀 Run Backend Locally

cd backend
python -m venv venv

Windows:

venv\Scripts\activate

Install dependencies:

pip install -r requirements.txt

Configure environment variables:

DATABASE_URL=your_database_url
JWT_SECRET_KEY=your_secret_key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
FRONTEND_URL=http://localhost:5173

Start FastAPI:

python -m uvicorn app.main:app --reload

Backend:

http://127.0.0.1:8000

Swagger:

http://127.0.0.1:8000/docs

☁️ Production Configuration

Frontend:

VITE_API_URL=https://flying-bird-backend.onrender.com

Backend:

FRONTEND_URL=https://flying-bird-game.onrender.com

Do not commit .env files, database credentials or JWT secrets to GitHub.

🚀 Deployment

Frontend — Render Static Site

Build command:

npm install && npm run build

Publish directory:

dist

Backend — Render Web Service

Build command:

pip install -r requirements.txt

Start command:

uvicorn app.main:app --host 0.0.0.0 --port $PORT

🔗 Links

GitHub: https://github.com/sheniya-ju/Flying-Bird-Game

Live Game: https://flying-bird-game.onrender.com

📌 Project Highlights

This project demonstrates:

React component-based development

TypeScript

Canvas game development

Real-time animation

Game physics

Collision detection

Responsive web design

REST API integration

JWT authentication

FastAPI backend development

SQLAlchemy ORM

PostgreSQL integration

Local persistence

Cloud deployment

👩‍💻 Author

Sheniya
