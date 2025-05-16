import userRoutes from './userRoutes.js';
import adminRoutes from './adminRoutes.js';
import transactionRoutes from './transactionRoutes.js';
import reportRoutes from './reportRoutes.js';

export default function setupRoutes(app) {
  // Set up API routes
  app.use('/api/users', userRoutes());
  app.use('/api/admin', adminRoutes());
  app.use('/api/transactions', transactionRoutes());
  app.use('/api/reports', reportRoutes());
  
  // Debug logging middleware
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
  
  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: err.message
    });
  });
  
  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: 'The requested resource was not found'
    });
  });
}