const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
require('dotenv').config();

const { notFound, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const serviceRequestRoutes = require('./routes/serviceRequestRoutes');
const billingRoutes = require('./routes/billingRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const flatRoutes = require('./routes/flatRoutes');

const app = express();

// ---------- Global middleware ----------
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));

// Serve uploaded complaint images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ---------- API docs (Swagger) ----------
try {
  const swaggerDocument = YAML.load(path.join(__dirname, '..', 'swagger.yaml'));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (e) {
  console.warn('Swagger docs not loaded:', e.message);
}

// ---------- Health check ----------
app.get('/health', (req, res) => res.json({ success: true, message: 'API is running' }));

// ---------- Routes ----------
app.use('/api/auth', authRoutes);
app.use('/api/flats', flatRoutes); // must come before the generic '/api' mount below (public GET /flats)
app.use('/api', userRoutes); // /api/residents, /api/committee
app.use('/api/complaints', complaintRoutes);
app.use('/api/service-requests', serviceRequestRoutes);
app.use('/api/bills', billingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ---------- 404 + error handling ----------
app.use(notFound);
app.use(errorHandler);

module.exports = app;
