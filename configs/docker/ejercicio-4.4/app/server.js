const express = require('express');
const { Pool } = require('pg');

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS visitas (
      id SERIAL PRIMARY KEY,
      ip TEXT NOT NULL,
      ua TEXT,
      ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

app.get('/health', async (_req, res) => {
  try {
    const r = await pool.query('SELECT 1 AS ok');
    res.json({ status: 'ok', db: r.rows[0].ok === 1 });
  } catch (e) {
    res.status(500).json({ status: 'error', error: e.message });
  }
});

app.get('/', async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const ua = req.headers['user-agent'] || '';
  await pool.query('INSERT INTO visitas (ip, ua) VALUES ($1, $2)', [ip, ua]);
  const total = await pool.query('SELECT COUNT(*)::int AS n FROM visitas');
  const ultimas = await pool.query(
    'SELECT id, ip, ts FROM visitas ORDER BY id DESC LIMIT 5'
  );
  res.type('text/html').send(`<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><title>Ejercicio 4.4</title>
<style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
font-family:ui-monospace,monospace;background:#1a1b26;color:#c0caf5}
.card{background:#24283b;border:1px solid #414868;border-radius:8px;
padding:2rem 3rem;max-width:680px;box-shadow:0 8px 32px rgba(0,0,0,.4)}
h1{color:#7aa2f7;margin-top:0}
code{background:#1a1b26;color:#f7768e;padding:.15em .4em;border-radius:4px}
.ok{color:#9ece6a;font-weight:bold}
table{border-collapse:collapse;margin-top:.5rem;width:100%}
td,th{border-bottom:1px solid #414868;padding:.4rem .6rem;text-align:left}
footer{margin-top:1.5rem;font-size:.85rem;color:#565f89;
border-top:1px solid #414868;padding-top:1rem}
</style></head>
<body><div class="card">
<h1>Ejercicio 4.4 - Stack Compose</h1>
<p>App <code>Node.js + Express</code> servida tras <code>Nginx</code> y conectada a <code>PostgreSQL 16</code>.</p>
<p class="ok">Visita registrada. Total: ${total.rows[0].n}</p>
<table>
  <thead><tr><th>id</th><th>ip</th><th>ts</th></tr></thead>
  <tbody>${ultimas.rows
    .map(r => `<tr><td>${r.id}</td><td>${r.ip}</td><td>${r.ts.toISOString()}</td></tr>`)
    .join('')}</tbody>
</table>
<footer>Curso FCT Zataca - Modulo 4 - Semana 7 - Docker Compose</footer>
</div></body></html>`);
});

ensureSchema()
  .then(() => app.listen(port, () => console.log(`miapp escuchando en :${port}`)))
  .catch(err => {
    console.error('No se pudo inicializar el esquema:', err.message);
    process.exit(1);
  });
