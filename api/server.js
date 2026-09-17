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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '75mb' }));
app.use(express.urlencoded({ extended: true, limit: '75mb' }));
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

app.get('/', (req, res) => {
  res.send('Portal Kolab API is running');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ status: 'error', message: err.status === 413 ? 'Ukuran upload melebihi batas server.' : 'Something went wrong!' });
});

export default app;

if (process.env.NODE_ENV !== 'test') app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Swagger docs available at https://api-portal.kolab.top/api-docs`);
});
