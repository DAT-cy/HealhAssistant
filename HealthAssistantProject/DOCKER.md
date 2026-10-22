# Docker Backend

Docker runs MySQL and the Spring Boot backend. The mobile app stays outside Docker and uses Expo.

From the repository root:

```sh
docker compose -f HealthAssistantProject/docker-compose.yml up -d --build mysql backend
```

The backend API is at `http://localhost:8084/api/v1`; Swagger UI is at `http://localhost:8084/swagger-ui/index.html`. MySQL is available to the backend as `mysql:3306` on the Compose network. Its persistent volume is retained when stopping the services.

The backend uses JPA entities with `ddl-auto: update` in local development. Missing tables and columns represented by entities are created when Spring Boot starts, but existing column types are not reliably widened. For an existing database, apply SQL files in `db/migrations/` once before restarting the backend. Keep the `mysql-data` volume when rebuilding or restarting the backend.

Run the React Native app from `heathreact`:

```sh
npm ci
npx expo start
```

Set `EXPO_PUBLIC_API_BASE_URL` in `heathreact/.env` before starting Expo. Use `http://10.0.2.2:8084` for an Android emulator, `http://localhost:8084` for web or an iOS simulator, and the host LAN IP for a physical device. Expo reads this value at startup, so restart Expo after changing it.

For WSL/Linux, run `npm ci` inside WSL before starting Expo. The existing WSL path under `/mnt/d` may contain Windows-built `node_modules`; native packages such as `lightningcss` need Linux binaries. If switching back to Windows development, run `npm ci` again from Windows.

Optional backend values such as `GOOGLE_OAUTH_CLIENT_IDS`, `GEMINI_API_KEY`, and Cloudinary credentials can be set in `HealthAssistantProject/.env`. The default database password and JWT key are for local development only.

Stop only the Docker services while preserving database files:

```sh
docker compose -f HealthAssistantProject/docker-compose.yml down
```
