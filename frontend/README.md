# Letterform Frontend

A React/Vite frontend for the existing Email Assistant backend. This directory is independent from `backend/` and `ai/`.

## Requirements and setup

```bash
cd frontend
npm install
npm run dev
```

Create `.env` from `.env.example` if the backend is not running at its default URL:

```env
VITE_API_URL=http://localhost:5000
VITE_AI_URL=http://localhost:8001
```

These are public client configuration values only. No secrets belong in Vite variables.

## Complete architecture

React communicates with the Node backend over REST. The backend owns authentication, Gmail OAuth/API, MongoDB persistence, and mailbox operations. The AI service is independent and is not called directly by this frontend. The backend-to-AI integration is not currently exposed by the inspected backend, so the UI displays `AI analysis unavailable` unless persisted AI fields are populated.

## Existing API contracts used

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/google?token=...` (existing backend OAuth contract)
- `DELETE /api/auth/google`
- `POST /api/gmail/sync`
- `GET /api/gmail/messages`
- `GET /api/gmail/messages/:id`
- `PATCH /api/gmail/messages/:id/read`
- `PATCH /api/gmail/messages/:id/star`
- `POST /api/gmail/send`
- `POST /api/gmail/messages/:id/reply`

The backend currently has no Event routes. The Events page intentionally shows that limitation rather than inventing API calls.

## Run the project

Terminal 1:

```bash
cd backend
npm start
```

Terminal 2:

```bash
cd ai
uvicorn app.main:app --host 0.0.0.0 --port 8001
```

Terminal 3:

```bash
cd frontend
npm install
npm run dev
```

## Flows

After login, the existing Gmail OAuth route is used. Once the backend marks Gmail connected, the connection screen can call the real sync endpoint. Mailbox views read persisted emails with pagination and server-side folder/read/star/search parameters. Compose and reply call the existing Gmail endpoints. Logout clears local authentication and user state.

## Known limitations

- Event CRUD APIs are not exposed by the backend, so Events is a documented unavailable state.
- AI results are not currently routed through the backend and are not fabricated by the frontend.
- Existing OAuth initiation requires the JWT in the query string because that is the backend's current contract; this should be replaced server-side in a future security phase.
- Category filtering is isolated in the page and depends on persisted `Email.category`; the current backend mailbox query does not expose a category filter.
