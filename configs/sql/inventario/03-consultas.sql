-- Ejercicio 5.1 - Consultas obligatorias y extras
-- Ejecutar tras 01-schema.sql + 02-seed.sql

-- =====================================================================
-- 1. Servidores activos
-- =====================================================================
SELECT id, nombre, ip, os, ram_gb, cpu_cores, ubicacion
  FROM servidores
 WHERE estado = 'activo'
 ORDER BY nombre;

-- =====================================================================
-- 2. Servicios por servidor (con totales)
-- =====================================================================
SELECT s.nombre        AS servidor,
       COUNT(sv.id)    AS total_servicios,
       COUNT(*) FILTER (WHERE sv.estado = 'activo')   AS activos,
       COUNT(*) FILTER (WHERE sv.estado = 'detenido') AS detenidos
  FROM servidores s
  LEFT JOIN servicios sv ON sv.servidor_id = s.id
 GROUP BY s.nombre
 ORDER BY s.nombre;

-- Detalle: listar todos los servicios con su servidor
SELECT s.nombre        AS servidor,
       sv.nombre       AS servicio,
       sv.puerto,
       sv.protocolo,
       sv.estado
  FROM servidores s
  JOIN servicios sv ON sv.servidor_id = s.id
 ORDER BY s.nombre, sv.puerto;

-- =====================================================================
-- 3. Incidencias abiertas (incluye estado 'abierta' y 'en_proceso')
-- =====================================================================
SELECT i.id,
       s.nombre        AS servidor,
       i.titulo,
       i.severidad,
       i.estado,
       i.abierta_en,
       NOW() - i.abierta_en AS tiempo_abierta
  FROM incidencias i
  JOIN servidores s ON s.id = i.servidor_id
 WHERE i.estado IN ('abierta', 'en_proceso')
 ORDER BY CASE i.severidad
            WHEN 'critica' THEN 1
            WHEN 'alta'    THEN 2
            WHEN 'media'   THEN 3
            WHEN 'baja'    THEN 4
          END,
          i.abierta_en;

-- =====================================================================
-- Extras (no obligatorias, ilustran JOINs y agregaciones)
-- =====================================================================

-- 4. Resumen por estado de servidor
SELECT estado, COUNT(*) AS total
  FROM servidores
 GROUP BY estado
 ORDER BY total DESC;

-- 5. Servidores con incidencias abiertas (con su numero)
SELECT s.nombre,
       s.ip,
       COUNT(i.id) AS incidencias_abiertas
  FROM servidores s
  JOIN incidencias i ON i.servidor_id = s.id
 WHERE i.estado IN ('abierta', 'en_proceso')
 GROUP BY s.nombre, s.ip
 ORDER BY incidencias_abiertas DESC;

-- 6. Tiempo medio de resolucion de incidencias cerradas
SELECT severidad,
       COUNT(*)                                          AS total,
       AVG(cerrada_en - abierta_en)                      AS tiempo_medio_resolucion
  FROM incidencias
 WHERE estado = 'cerrada'
 GROUP BY severidad
 ORDER BY total DESC;
