-- Ejercicio 5.1 - Inventario de servidores
-- Esquema relacional: servidores, servicios, incidencias
-- Destino: PostgreSQL 17, base de datos "inventario", usuario "danny"

BEGIN;

-- Limpieza si se reaplica el script (orden inverso por las FK)
DROP TABLE IF EXISTS incidencias CASCADE;
DROP TABLE IF EXISTS servicios   CASCADE;
DROP TABLE IF EXISTS servidores  CASCADE;

-- =====================================================================
-- Tabla: servidores
-- =====================================================================
CREATE TABLE servidores (
    id          SERIAL       PRIMARY KEY,
    nombre      VARCHAR(100) NOT NULL UNIQUE,
    ip          INET         NOT NULL,
    os          VARCHAR(50),
    ram_gb      INTEGER,
    cpu_cores   INTEGER,
    estado      VARCHAR(20)  NOT NULL DEFAULT 'activo'
                CHECK (estado IN ('activo', 'mantenimiento', 'inactivo')),
    ubicacion   VARCHAR(50),
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  servidores              IS 'Inventario fisico/logico de hosts del entorno';
COMMENT ON COLUMN servidores.ip           IS 'Direccion de gestion (IPv4 o IPv6, validada por tipo INET)';
COMMENT ON COLUMN servidores.estado       IS 'activo: en uso | mantenimiento: temporal fuera | inactivo: dado de baja';

-- =====================================================================
-- Tabla: servicios (N por servidor)
-- =====================================================================
CREATE TABLE servicios (
    id           SERIAL       PRIMARY KEY,
    servidor_id  INTEGER      NOT NULL REFERENCES servidores(id) ON DELETE CASCADE,
    nombre       VARCHAR(100) NOT NULL,
    puerto       INTEGER      CHECK (puerto BETWEEN 1 AND 65535),
    protocolo    VARCHAR(10)  CHECK (protocolo IN ('tcp', 'udp')),
    estado       VARCHAR(20)  NOT NULL DEFAULT 'activo'
                 CHECK (estado IN ('activo', 'detenido')),
    UNIQUE (servidor_id, nombre, puerto)
);

CREATE INDEX idx_servicios_servidor ON servicios(servidor_id);

COMMENT ON TABLE servicios IS 'Servicios desplegados en cada servidor (HTTP, SSH, BD, etc.)';

-- =====================================================================
-- Tabla: incidencias (N por servidor, abiertas o cerradas)
-- =====================================================================
CREATE TABLE incidencias (
    id           SERIAL       PRIMARY KEY,
    servidor_id  INTEGER      NOT NULL REFERENCES servidores(id) ON DELETE CASCADE,
    titulo       VARCHAR(200) NOT NULL,
    descripcion  TEXT,
    severidad    VARCHAR(20)  NOT NULL DEFAULT 'media'
                 CHECK (severidad IN ('baja', 'media', 'alta', 'critica')),
    estado       VARCHAR(20)  NOT NULL DEFAULT 'abierta'
                 CHECK (estado IN ('abierta', 'en_proceso', 'cerrada')),
    abierta_en   TIMESTAMP    NOT NULL DEFAULT NOW(),
    cerrada_en   TIMESTAMP,
    -- Coherencia: si esta cerrada debe tener fecha de cierre, y viceversa
    CHECK ((estado = 'cerrada' AND cerrada_en IS NOT NULL)
        OR (estado <> 'cerrada' AND cerrada_en IS NULL))
);

CREATE INDEX idx_incidencias_servidor ON incidencias(servidor_id);
CREATE INDEX idx_incidencias_estado   ON incidencias(estado);

COMMENT ON TABLE incidencias IS 'Registro de incidencias detectadas en los servidores';

COMMIT;
