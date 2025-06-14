import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import performanceRoutes from './routes/performanceRoutes.js';
import logger from './middlewares/logger.js';
import errorHandler from './middlewares/errorHandler.js';
import pool from './config/db.js';
import authRoutes from "./routes/authRoutes.js";
import employeesRoute from "./routes/employeesRoute.js"
import managerRoutes from "./routes/managerRoutes.js"


const app = express();
const PORT = 5001;

// ✅ Corrected CORS config
app.use(cors({
  origin: ['http://localhost:3000', 'https://performance-tool-frontend.vercel.app'],
  credentials: true
}));

app.use(bodyParser.json());
app.use(logger);

app.use('/api', performanceRoutes);
app.use("/api/auth", authRoutes);
app.use('/api' , employeesRoute)
app.use("/api/manager", managerRoutes)


app.use(errorHandler);

pool.connect()
  .then(() => console.log('Connected to Render Postgres!'))
  .catch(err => console.error('Error connecting to Postgres:', err));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
