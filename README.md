# AI-Based Email Assistant

An intelligent, full-stack email assistant designed to automate email processing, categorization, event extraction, and smart inbox management using deep learning and modern web technologies.

---

## 🌟 Key Features

- **Google OAuth 2.0 & Gmail Integration**: Securely connect and sync emails using the Gmail API.
- **Smart Inbox & Search**: Browse, search, and manage emails through a responsive interface.
- **AI-Powered Email Intelligence**:
  - **Spam & Priority Detection**: Automatically classify incoming emails.
  - **Category Classification**: Categorize work, personal, social, and transactional emails.
  - **Event Extraction**: Extract dates, meeting times, and calendar events from email content.
  - **Smart Reply & Drafting**: Generate AI-powered reply suggestions and email drafts.
- **Microservices Architecture**: Separate frontend, backend, and AI services for modular development and maintenance.

---

## 🏗️ Architecture & Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite, React Router, CSS |
| **Backend** | Node.js, Express 5, MongoDB, Mongoose, Google APIs, JWT |
| **AI Engine** | Python, FastAPI, PyTorch, Hugging Face Transformers |
| **Security** | Helmet, Rate Limiting, bcrypt, dotenv |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (18 or later)
- **Python** (3.10 or later)
- **MongoDB** installed locally or a MongoDB Atlas account
- **Google Cloud Console project** with OAuth 2.0 credentials & Gmail API enabled
- **Git**

---

### 1. Backend Setup

Navigate to the backend directory and install the dependencies:
```bash
cd backend
npm install
```

Create your environment configuration file:
- **Windows (Command Prompt):**
  ```cmd
  copy .env.example .env
  ```
- **Linux/macOS:**
  ```bash
  cp .env.example .env
  ```

Edit `backend/.env` and configure the following variables:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/email_major_project
JWT_SECRET=your_secure_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
FRONTEND_ORIGIN=http://localhost:5173
AI_SERVICE_URL=http://localhost:8001
```
*Replace placeholder values with your actual configuration.*

Start the backend server:
```bash
npm run dev
```

---

### 2. Frontend Setup

Open a new terminal and navigate to the frontend directory:
```bash
cd frontend
npm install
```

Create the frontend environment file:
- **Windows (Command Prompt):**
  ```cmd
  copy .env.example .env
  ```
- **Linux/macOS:**
  ```bash
  cp .env.example .env
  ```

Configure `frontend/.env`:
```env
VITE_API_URL=http://localhost:5000
VITE_AI_URL=http://localhost:8001
```

Start the frontend development server:
```bash
npm run dev
```

The frontend will typically be available at:
`http://localhost:5173`

---

### 3. AI Service Setup

Open another terminal and navigate to the AI service directory:
```bash
cd ai
```

Create a Python virtual environment:
```bash
python -m venv .venv
```

Activate the virtual environment:
- **Windows (Command Prompt):**
  ```cmd
  .venv\Scripts\activate
  ```
- **Linux/macOS:**
  ```bash
  source .venv/bin/activate
  ```

Install the Python dependencies:
```bash
pip install -r requirements.txt
```

Create the AI service environment file if an example is provided:
- **Windows:**
  ```cmd
  copy .env.example .env
  ```
- **Linux/macOS:**
  ```bash
  cp .env.example .env
  ```

Start the FastAPI service:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

The API documentation will typically be available at:
`http://localhost:8001/docs`

---

## 🔐 Google OAuth Configuration

1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a Google Cloud project.
3. Enable the **Gmail API**.
4. Configure the **OAuth consent screen**.
5. Create an **OAuth 2.0 Client ID** for a web application.
6. Add the following authorized redirect URI:
   ```text
   http://localhost:5000/api/auth/google/callback
   ```
7. Copy the generated Client ID and Client Secret into `backend/.env`.
8. Configure the required Gmail OAuth scopes in your application.
9. *The redirect URI must exactly match the URI configured in Google Cloud Console.*

---

## 🔒 Security Best Practices

- Never commit `.env` files or expose credentials in a public repository.
- Ensure `.env` files are added to `.gitignore`.
- Keep `.env.example` files free of real secrets.
- Generate a strong, unique JWT secret.
- Never expose the Google Client Secret in frontend code.
- Validate and sanitize incoming requests.
- Use HTTPS and secure cookie settings in production.
- Restrict OAuth redirect URIs to trusted destinations.

---

## 📁 Project Structure

```text
AI-Based-Email-Assistant/
├── backend/
│   ├── .env.example
│   ├── package.json
│   └── ...
├── frontend/
│   ├── .env.example
│   ├── package.json
│   └── ...
├── ai/
│   ├── requirements.txt
│   ├── .env.example
│   └── ...
├── .gitignore
└── README.md
```
> *Note: The structure above is illustrative. Adjust it to match the actual files and folders in your repository.*

---

## 📄 License

This project is licensed under the ISC License. See the LICENSE file for details.
