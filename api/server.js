import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import { fileURLToPath } from 'url';

// Route imports
import fileRoutes from './routes/files.js';
import authRoutes from './routes/auth.js';
import dataRoutes from './routes/data.js';
import aiRoutes from './routes/ai.js';
import healthRoutes from './routes/health.js';
import bridgeRoutes from './routes/bridge.js';
import migrationRoutes from './routes/migration.js';
import photoboothRoutes from './routes/photobooth.js';
import memberTransferRoutes from './routes/memberTransfer.js';
import internshipTransferRoutes from './routes/internshipTransfer.js';
import workloadRoutes from './routes/workloads.js';
import studentStatusRoutes from './routes/studentStatus.js';
import lecturerRoutes from './routes/lecturer.js';
import assetRoutes from './routes/assets.js';
import mitraRoutes from './routes/mitra.js';
import lettersRoutes from './routes/letters.js';
import { migrate } from './scripts/migrate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Keamanan: Sembunyikan fingerprint server Express
app.disable('x-powered-by');

// Keamanan: Security Headers Middleware (OWASP Recommendation)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN'); // Memungkinkan pratinjau PDF baku di iframe portal
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Keamanan: Konfigurasi CORS terkontrol
const configuredOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()).filter(Boolean)
  : null;

app.use(cors({
  origin: (origin, callback) => {
    // Izinkan request tanpa origin (seperti mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (!configuredOrigins || configuredOrigins.includes('*') || configuredOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Izinkan localhost secara default di dev jika CORS_ORIGIN belum dikonfigurasi
    if (/^http:\/\/localhost(:\d+)?$/.test(origin) || /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS policy: Origin tidak diizinkan.'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use(morgan('dev'));

// Swagger documentation
const swaggerDocument = YAML.load(path.join(__dirname, 'swagger.yml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Routes
app.use('/api/files', fileRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/bridge', bridgeRoutes);
app.use('/api/migration', migrationRoutes);
app.use('/api/photobooth', photoboothRoutes);
app.use('/api/admin/members', memberTransferRoutes);
app.use('/api/admin/internships', internshipTransferRoutes);
app.use('/api/workloads', workloadRoutes);
app.use('/api/student', studentStatusRoutes);
app.use('/api/lecturer', lecturerRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/mitra', mitraRoutes);
app.use('/api/letters', lettersRoutes);

app.get('/', (req, res) => {
  res.send('Portal Kolab API is running');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[ServerError]', err.stack || err.message);
  if (err.message && err.message.includes('CORS policy')) {
    return res.status(403).json({ status: 'error', message: err.message });
  }
  const status = err.status || 500;
  const isDev = process.env.NODE_ENV === 'development';
  let message;
  if (status === 413) {
    message = 'Ukuran berkas melebihi batas unggah server.';
  } else if (status < 500) {
    message = err.message || 'Permintaan tidak valid.';
  } else {
    message = isDev ? err.message : 'Terjadi kesalahan internal pada server.';
  }
  res.status(status).json({ status: 'error', message });
});

export default app;

// The schema migration is additive (CREATE TABLE IF NOT EXISTS, guarded ADD COLUMN), so it runs on every
// start: a deploy that ships a route for a new table cannot go live without that table (mitras, 2026-10-20).
const start = async () => {
  try {
    await migrate();
    console.log('[Migrate] Database schema is up to date.');
  } catch (error) {
    console.error('[Migrate] Schema migration failed; routes that need new tables will error:', error.message);
  }
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Swagger docs available at https://api-portal.kolab.top/api-docs`);
  });
};

if (process.env.NODE_ENV !== 'test') start();

