# TriCipher

**Think Like A Hacker. Protect Like A Pro.**

TriCipher is a cybersecurity education platform with a **React** frontend, **Flask** REST API, and **AWS-compatible MongoDB** (DocumentDB / Atlas). It teaches password security through simulated attacks, an Ollama AI coach, and secure password generation.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, Vite, React Router |
| **Backend** | Python 3.10+, Flask 3 (JSON API) |
| **Database** | MongoDB / **AWS DocumentDB** / MongoDB Atlas (PyMongo) |
| **Auth** | Flask sessions + Werkzeug scrypt hashing |
| **AI (optional)** | Ollama local LLM |

**Architecture:** React SPA → Flask `/api/*` → MongoDB on AWS (or local for dev)

---

## Project Structure

```
TriCipher/
├── app.py                 # Flask API + serves React build
├── db.py                  # MongoDB / AWS DocumentDB connection
├── ollama_client.py       # Ollama API client
├── requirements.txt
├── .env.example
├── frontend/              # React app (Vite)
│   ├── src/
│   │   ├── pages/         # Home, Login, Register, Account, Admin
│   │   ├── components/  # Chat, Simulator, Generator, etc.
│   │   ├── context/     # AuthContext
│   │   └── api/         # API client
│   └── dist/            # Production build (served by Flask)
├── templates/             # Legacy Jinja (unused — kept for reference)
└── static/                # Legacy static (unused — kept for reference)
```

---

## Quick Start

### 1. Backend

```powershell
cd c:\Users\marsh\Downloads\TriCipher
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 2. Database

**Local dev:** run MongoDB on port 27017, or use Docker:

```powershell
docker run -d --name tricipher-mongo -p 27017:27017 mongo:7
```

**AWS:** see [AWS Database Setup](#aws-database-setup) below.

Copy `.env.example` to `.env` and set your connection string.

### 3. Frontend

**Development** (hot reload + API proxy):

```powershell
# Terminal 1 — Flask API
python app.py

# Terminal 2 — React dev server
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** (Vite proxies `/api` to Flask on port 5000).

**Production** (single server):

```powershell
cd frontend
npm run build
cd ..
python app.py
```

Open **http://127.0.0.1:5000** — Flask serves the React build and API.

---

## AWS Database Setup

The app uses **PyMongo** and works with:

| Service | Use case |
|---------|----------|
| **Amazon DocumentDB** | AWS-native MongoDB-compatible cluster |
| **MongoDB Atlas on AWS** | Managed MongoDB hosted in AWS regions |
| **Local MongoDB** | Development only |

### Amazon DocumentDB

1. Create a DocumentDB cluster in the AWS Console
2. Download the [RDS combined CA bundle](https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem)
3. Save as `certs/rds-combined-ca-bundle.pem`
4. Set in `.env`:

```env
AWS_DOCUMENTDB=true
MONGODB_TLS=true
MONGODB_TLS_CA_FILE=./certs/rds-combined-ca-bundle.pem
MONGODB_URI=mongodb://USER:PASSWORD@your-cluster.cluster-xxxxx.us-east-1.docdb.amazonaws.com:27017/?tls=true&replicaSet=rs0&readPreference=secondaryPreferred
MONGODB_DB_NAME=tricipher
```

### MongoDB Atlas (AWS region)

```env
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/tricipher?retryWrites=true&w=majority
MONGODB_DB_NAME=tricipher
AWS_DOCUMENTDB=false
```

Ensure your Atlas IP allowlist includes your server IP (or `0.0.0.0/0` for testing only).

---

## Features

| Feature | Auth | Description |
|---------|------|-------------|
| AI Security Coach | Login | Ollama-powered chat demo |
| Hacker Simulator | — | Brute-force terminal animation |
| Social Engineering | — | Personal-info password guessing |
| Password Generator | — | Crypto-secure browser generator |
| Account Security | Login | 6-month password rotation + change form |
| Admin Panel | Admin | User management + rotation status |

---

## Password Rotation

Users must change passwords every **6 months** (182 days). Reminders appear 14 days before expiry on login and the Account page.

- **Page:** `/account` (React route)
- **API:** `POST /api/account/change-password`

---

## API Reference

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/me` | — | Current user (null if logged out) |
| POST | `/api/auth/login` | — | Login |
| POST | `/api/auth/register` | — | Register |
| POST | `/api/auth/logout` | — | Logout |
| POST | `/api/account/change-password` | Login | Change password |
| POST | `/api/chat` | Login | AI chat message |
| GET | `/api/chat/status` | Login | Ollama status |
| GET | `/api/users` | Admin | List users |
| PUT | `/api/users/<id>` | User/Admin | Update user |
| DELETE | `/api/users/<id>` | Admin | Delete user |

All other routes serve the React SPA (`frontend/dist`).

---

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `SECRET_KEY` | Random | Flask session secret |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017` | MongoDB / DocumentDB / Atlas URI |
| `MONGODB_DB_NAME` | `tricipher` | Database name |
| `AWS_DOCUMENTDB` | `false` | Enable DocumentDB TLS settings |
| `MONGODB_TLS` | `false` | Force TLS connection |
| `MONGODB_TLS_CA_FILE` | — | Path to AWS RDS CA bundle |
| `CORS_ORIGINS` | `http://localhost:5173,...` | Allowed React dev origins |
| `PASSWORD_ROTATION_DAYS` | `182` | Password expiry interval |
| `OLLAMA_MODEL` | `llama3.2` | Ollama model name |

---

## Default Admin

| Username | Password |
|----------|----------|
| `admin` | `admin123` |

Created automatically when the database is empty.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Blank page on `:5000` | Run `cd frontend && npm run build` |
| API CORS errors in dev | Use Vite dev server (`npm run dev`) or set `CORS_ORIGINS` |
| `ServerSelectionTimeoutError` | Check MongoDB/DocumentDB URI, security groups, IP allowlist |
| DocumentDB TLS error | Set `MONGODB_TLS_CA_FILE` to RDS CA bundle |
| Chat requires login | Register or use default admin account |

---

**TriCipher** — React + Flask + AWS MongoDB + Ollama. Educational use only.
