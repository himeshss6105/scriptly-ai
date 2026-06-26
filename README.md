# Scriptly.AI — Trend-to-Content Intelligence Platform

Scriptly.AI bridges the gap between **what is trending** and **what should be created**. It detects emerging topics, analyses audience interest, and generates platform-specific content in minutes.

---

## Architecture

```
scriptly-ai/
├── backend/                  # Node.js + Express API
│   ├── config/db.js          # MongoDB Atlas connection
│   ├── controllers/
│   │   ├── authController.js
│   │   └── contentController.js
│   ├── middleware/authMiddleware.js  # JWT guard
│   ├── models/
│   │   ├── User.js
│   │   └── Content.js
│   ├── routes/
│   │   ├── authRoutes.js     # POST /api/auth/signup, /api/auth/login
│   │   └── contentRoutes.js  # POST /api/content/generate, /analyse-trend; GET /history
│   ├── services/geminiService.js    # Google Gemini AI calls
│   ├── server.js
│   └── .env.example
└── frontend/                 # Vanilla HTML/CSS/JS (served by Express)
    ├── index.html            # Landing page
    ├── login.html
    ├── signup.html
    ├── dashboard.html        # The main console
    ├── css/style.css
    └── js/
        ├── main.js           # Shared auth helpers
        ├── auth.js           # Login / signup form logic
        └── dashboard.js      # Trend analysis + content generation
```

---

## Setup

### 1. Clone & install

```bash
cd backend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB Atlas connection string (see below) |
| `JWT_SECRET` | Long random string for signing tokens |
| `JWT_EXPIRES_IN` | Session duration, e.g. `7d` |
| `GEMINI_API_KEY` | Google AI Studio key from https://aistudio.google.com/app/apikey |

### 3. MongoDB Atlas setup

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) → **Create a free cluster**
2. **Database Access** → Add a user with a strong password
3. **Network Access** → Add your IP (or `0.0.0.0/0` for dev)
4. **Connect** → Drivers → Node.js → copy the connection string
5. Paste it as `MONGO_URI` in your `.env`, replacing `<password>` with your actual password

To view/edit data: open **MongoDB Compass**, paste the same URI, and connect.

### 4. Run

```bash
npm run dev     # uses nodemon (requires: npm install -D nodemon)
# or
node server.js
```

The server starts at `http://localhost:5000` and serves the frontend from there.  
**Do not open the HTML files directly** — open `http://localhost:5000` so the API calls resolve.

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | — | Register a new user |
| POST | `/api/auth/login` | — | Login, returns JWT |
| POST | `/api/content/generate` | JWT | Generate content |
| POST | `/api/content/analyse-trend` | JWT | Analyse a trending topic |
| GET | `/api/content/history` | JWT | Load past 50 generations |
| GET | `/api/health` | — | Server health check |

---

## Content Types

| Type | Description |
|---|---|
| `script` | YouTube video script with hooks and cues |
| `caption` | Instagram / social media caption with hashtags |
| `blog` | Structured blog post with subheadings |
| `thread` | Numbered Twitter/X thread |
| `email` | Email with subject line and sign-off |
| `ad` | Ad copy with headline and CTA |
| `outline` | Video content outline with talking points |
