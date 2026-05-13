-- Ejercicio 5.1 - Datos ficticios
-- Se asume que 01-schema.sql ya esta aplicado (tablas vacias)

BEGIN;

-- =====================================================================
-- Servidores (6 hosts)
-- =====================================================================
INSERT INTO servidores (nombre, ip, os, ram_gb, cpu_cores, estado, ubicacion) VALUES
  ('web01',   '10.160.132.10', 'Debian 12',     8,  4, 'activo',         'rack-a'),
  ('web02',   '10.160.132.11', 'Debian 12',     4,  2, 'activo',         'rack-a'),
  ('db01',    '10.160.132.20', 'Debian 13',    16,  8, 'activo',         'rack-b'),
  ('db02',    '10.160.132.21', 'Debian 13',    16,  8, 'mantenimiento',  'rack-b'),
  ('cache1',  '10.160.132.30', 'Ubuntu 22.04',  2,  2, 'activo',         'rack-c'),
  ('backup1', '10.160.132.40', 'Debian 12',     8,  4, 'inactivo',       'rack-c');

-- =====================================================================
-- Servicios (14 entradas distribuidas)
-- =====================================================================
INSERT INTO servicios (servidor_id, nombre, puerto, protocolo, estado) VALUES
  -- web01 (3 servicios)
  ((SELECT id FROM servidores WHERE nombre = 'web01'),  'nginx',      80,  'tcp', 'activo'),
  ((SELECT id FROM servidores WHERE nombre = 'web01'),  'nginx',     443,  'tcp', 'activo'),
  ((SELECT id FROM servidores WHERE nombre = 'web01'),  'ssh',        22,  'tcp', 'activo'),
  -- web02 (3 servicios)
  ((SELECT id FROM servidores WHERE nombre = 'web02'),  'nginx',      80,  'tcp', 'activo'),
  ((SELECT id FROM servidores WHERE nombre = 'web02'),  'nginx',     443,  'tcp', 'detenido'),
  ((SELECT id FROM servidores WHERE nombre = 'web02'),  'ssh',        22,  'tcp', 'activo'),
  -- db01 (3 servicios)
  ((SELECT id FROM servidores WHERE nombre = 'db01'),   'postgres', 5432,  'tcp', 'activo'),
  ((SELECT id FROM servidores WHERE nombre = 'db01'),   'mariadb',  3306,  'tcp', 'activo'),
  ((SELECT id FROM servidores WHERE nombre = 'db01'),   'ssh',        22,  'tcp', 'activo'),
  -- db02 (mantenimiento - servicios detenidos)
  ((SELECT id FROM servidores WHERE nombre = 'db02'),   'postgres', 5432,  'tcp', 'detenido'),
  ((SELECT id FROM servidores WHERE nombre = 'db02'),   'ssh',        22,  'tcp', 'activo'),
  -- cache1
  ((SELECT id FROM servidores WHERE nombre = 'cache1'), 'redis',    6379,  'tcp', 'activo'),
  ((SELECT id FROM servidores WHERE nombre = 'cache1'), 'ssh',        22,  'tcp', 'activo'),
  -- backup1 (inactivo, conserva solo ssh para administracion)
  ((SELECT id FROM servidores WHERE nombre = 'backup1'),'ssh',        22,  'tcp', 'detenido');

-- =====================================================================
-- Incidencias (7 entradas: 4 abiertas/en_proceso, 3 cerradas)
-- =====================================================================
INSERT INTO incidencias (servidor_id, titulo, descripcion, severidad, estado, abierta_en, cerrada_en) VALUES
  ((SELECT id FROM servidores WHERE nombre = 'web02'),
   'HTTPS caido',
   'El servicio nginx 443 esta detenido tras renovacion de certificado',
   'alta', 'abierta',
   NOW() - INTERVAL '2 hours', NULL),

  ((SELECT id FROM servidores WHERE nombre = 'db02'),
   'Actualizacion PostgreSQL pendiente',
   'Migracion a PG17 programada para esta noche',
   'media', 'en_proceso',
   NOW() - INTERVAL '1 day', NULL),

  ((SELECT id FROM servidores WHERE nombre = 'web01'),
   'Uso de CPU elevado',
   'Picos del 95% durante las ultimas horas, posible bot scraping',
   'media', 'abierta',
   NOW() - INTERVAL '6 hours', NULL),

  ((SELECT id FROM servidores WHERE nombre = 'cache1'),
   'Memoria casi llena',
   'Redis ocupa 1.8GB de 2GB, evaluar maxmemory-policy',
   'baja', 'abierta',
   NOW() - INTERVAL '3 days', NULL),

  ((SELECT id FROM servidores WHERE nombre = 'db01'),
   'Fallo de replicacion (resuelto)',
   'Slot logico se quedo atras, se resincronizo manualmente',
   'critica', 'cerrada',
   NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days'),

  ((SELECT id FROM servidores WHERE nombre = 'web01'),
   'Certificado SSL caducado (resuelto)',
   'Renovado con certbot, configurado auto-renew',
   'alta', 'cerrada',
   NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'),

  ((SELECT id FROM servidores WHERE nombre = 'backup1'),
   'Disco lleno (resuelto)',
   'Rotacion de backups no se ejecutaba, ajustado mtime a 30 dias',
   'media', 'cerrada',
   NOW() - INTERVAL '30 days', NOW() - INTERVAL '28 days');

COMMIT;
