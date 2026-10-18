-- =============================================================================
-- SNHCE - Inicialización de PostgreSQL
-- =============================================================================
-- 1. Crear base de datos para Keycloak si no existe
SELECT 'CREATE DATABASE keycloak'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'keycloak')\gexec

-- 2. Conceder privilegios sobre keycloak al usuario de la aplicación
GRANT ALL PRIVILEGES ON DATABASE keycloak TO snhce_user;

-- 3. Crear usuario de replicación para hot-standby (desarrollo)
DO
$do$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'replicator') THEN
      CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD 'Dev_Replicator_2024!';
   END IF;
END
$do$;
