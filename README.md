# GACOR S.A. - API Control Vehicular v2 (Fase 1)

API REST construida con NestJS, TypeScript y PostgreSQL (PostGIS) limpia y optimizada para despliegue gratuito.

## 🚀 Pasos para ejecutar en Linux (VS Code)

### 1. Requisitos
- Node.js v20+ (`node -v`)
- Docker y Docker Compose (`docker compose version`)
- VS Code con las extensiones recomendadas:
  - ESLint
  - Prettier
  - Docker
  - REST Client / Postman

### 2. Instalación de Dependencias
```bash
npm install
```

### 3. Iniciar Base de Datos PostgreSQL Local con Docker
```bash
docker compose up -d --build
```
Esto iniciará PostgreSQL 16 con PostGIS y ejecutará `GACOR_DERCAS_PostgreSQL_v3_GPS.sql` al crear el volumen de datos por primera vez. El API esperará a que PostgreSQL esté listo antes de arrancar.

### 4. Configurar Variables de Entorno
Si ejecutas la API directamente en tu máquina en lugar de usar el servicio `api` de Docker:
```bash
cp .env.example .env
```
Genera un secreto propio para `AUTH_TOKEN_SECRET` (por ejemplo, con `openssl rand -base64 32`) y configúralo en `.env`. Luego ejecuta:
```bash
npm run start:dev
```
Con Docker, el panel queda disponible en `http://localhost:3000` y la API en `http://localhost:3000/api/v1`.

### 5. Crear el usuario administrador inicial
Con los servicios de Docker levantados, ejecuta una sola vez:
```bash
docker compose exec api npm run create:admin
```
El comando crea la cuenta indicada por `ADMIN_EMAIL` (por defecto `admin@gacor.com.gt`), le asigna el rol `ADMINISTRADOR` y genera una contraseña aleatoria que solo muestra después de guardar la cuenta. Guárdala en un gestor de contraseñas. Para usar otro correo, configúralo en `.env` y recrea el servicio `api` antes de ejecutar el comando. No vuelvas a ejecutarlo si ese correo ya existe.

Si el esquema ya fue inicializado antes de incluir la asignación automática de permisos, sincronízalos una vez:
```bash
docker compose exec api npm run sync:admin-permissions
```

### 6. Verificación de Endpoints
- **Panel web:** `http://localhost:3000/` (estado de API/base de datos e inicio de sesión)
- **Health Check Live:** `http://localhost:3000/api/v1/health/live`
- **Health Check Ready:** `http://localhost:3000/api/v1/health/ready`
- **Catálogo administrativo:** `GET /api/v1/admin/catalog` (requiere JWT con permiso `USUARIOS_ADMINISTRAR`; lista rutas implementadas y tablas/vistas del esquema `gacor`)
- **Datos administrativos:** `GET /api/v1/admin/data/:relation?offset=0` (mismo permiso; solo lectura, 50 filas por página; oculta columnas de hashes, contraseñas y tokens)
- **Usuarios:** `GET /api/v1/users` y `GET /api/v1/users/:id` (requieren JWT con permiso `USUARIOS_ADMINISTRAR`)
- **Login POST:** `http://localhost:3000/api/v1/auth/login` (usa el correo y la contraseña que mostró el comando anterior).
  - Body JSON:
  ```json
  {
    "correo": "admin@gacor.com.gt",
    "password": "contraseña-generada-por-create:admin",
    "client": "web"
  }
  ```

---
*Desarrollado para GACOR S.A. - 2026*
