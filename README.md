# AI-Based Email Assistant

An intelligent, full-stack email assistant designed to automate email processing, categorization, event extraction, and smart inbox management using deep learning and modern web technologies.

---

## 🌟 Key Features

- **Google OAuth2 & Gmail Integration**: Securely connect and sync emails directly with Gmail API.
- **Smart Inbox & Search**: Fast and responsive inbox interface for browsing, searching, and managing emails.
- **AI-Powered Email Intelligence**:
  - **Spam & Priority Detection**: Classify incoming emails automatically.
  - **Category Classification**: Categorize work, personal, social, and transactional emails.
  - **Event Extraction**: Extract dates, meeting times, and calendar events automatically from email text.
  - **Smart Reply & Drafting**: AI suggestions for prompt communication.
- **Microservices Architecture**: Decoupled Frontend (React), Backend API (Node.js/Express), and AI Service (FastAPI & PyTorch/Transformers).

---

## 🏗️ Architecture & Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite, React Router, Modern CSS |
| **Backend** | Node.js, Express 5, MongoDB, Mongoose, Google APIs, JWT |
| **AI Engine** | Python 3.12, FastAPI, PyTorch, Hugging Face Transformers |
| **Security** | Helmet, Rate Limiting, Bcrypt, Dotenv for secret management |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18+)
- **Python** (v3.10+)
- **MongoDB** running locally or via MongoDB Atlas
- **Google Cloud Console Credentials** (OAuth 2.0 Client ID and Client Secret with Gmail API enabled)

---

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env` with your actual configuration:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/email_major_project
JWT_SECRET=your_jwt_secret_here
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
FRONTEND_ORIGIN=http://localhost:5173
AI_SERVICE_URL=http://localhost:8001
```

Start the backend server:
```bash
npm run dev
```

---

### 2. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
```

Edit `frontend/.env` if your ports differ:
```env
VITE_API_URL=http://localhost:5000
VITE_AI_URL=http://localhost:8001
```

Run the development server:
```bash
npm run dev
```

---

### 3. AI Service Setup

```bash
cd ai
python -m venv .venv
# Activate virtual environment
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
```

Start the FastAPI service:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

---

## 🔒 Security Best Practices

- **Never commit `.env` files**: All private tokens, passwords, and client secrets are kept exclusively in local `.env` files and ignored in `.gitignore`.
- **Reference `.env.example`**: Use `.env.example` templates across each module (`frontend`, `backend`, `ai`) to guide configuration setup.

---

## 📄 License

This project is licensed under the ISC License.
