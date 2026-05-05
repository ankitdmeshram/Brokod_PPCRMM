# BROKOD Docker Setup

This repo now includes a Docker setup with a single `nginx` entrypoint for all apps:

- `nginx`: single entrypoint on `http://localhost:5000`
- `web`: Next.js landing pages on `/`
- `Frontend`: React/Vite app on `/projects`
- `Backend`: Node/Express API on `/api`
- `db`: MySQL 8.4 on `localhost:3307` and the internal Docker network

## Start everything

1. Copy `.env.example` to `.env`
2. Run:

```bash
docker compose up --build
```

The backend creates the database if needed and runs Knex migrations on startup.

## Stop everything

```bash
docker compose down
```

To remove the database volume too:

```bash
docker compose down -v
```

## Notes

- Nginx handles all public routes and forwards `/`, `/projects`, and `/api` to the right container.
- The React app is built with `VITE_BASE_PATH=/projects/` and is served behind nginx at `/projects`.
- The React app uses same-origin API calls, so `VITE_API_DOMAIN` can stay empty in Docker.
- The backend allows the origin defined by `FRONTEND_DOMAIN`.
- The Next.js `web` app is built using standalone output for a smaller runtime image.
- The MySQL container is exposed on host port `3307` by default, which avoids conflicts with any local MySQL already using port `3306`.
