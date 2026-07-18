# Auth Frontend

Standalone React/Vite application for Brokod Projects authentication.

- Development through the main Docker stack: `http://localhost:5000/auth/signin`
- Sign up: `http://localhost:5000/auth/signup`
- Direct local development: `npm install && npm run dev -- --port 5174`

The app stores the existing `ppcrmm_auth_session` cookie at `/`, then redirects
to the product application under `/workspace`. Both applications must be served
from the same origin for this session handoff to work.

## Source structure

```text
src/
├── components/
│   ├── auth/
│   └── routing/
├── config/
├── context/
├── pages/
├── services/
├── styles/
├── theme/
└── utils/
```
