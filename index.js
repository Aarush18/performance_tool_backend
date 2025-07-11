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
import timelineRoutes from "./routes/timelineRoutes.js"
import tagRoutes from "./routes/tagRoutes.js"
import adminRoutes from "./routes/adminRoutes.js"
import superAdminRoutes from "./routes/superAdminRoutes.js"



const app = express();
const PORT = 5001;

// ✅ Corrected CORS config
app.use(cors({
  origin: ['http://localhost:3001',"http://localhost:3000",'http://192.168.1.17:3000', 'https://performance-tool-frontend.vercel.app'],
  credentials: true
}));

app.use(bodyParser.json());
app.use(logger);

app.use('/api', performanceRoutes);
app.use("/api/auth", authRoutes);
app.use('/api' , employeesRoute)
app.use("/api/manager", managerRoutes)
app.use("/api/timeline", timelineRoutes)
app.use("/api/tags", tagRoutes)
app.use("/api/admin" , adminRoutes)
app.use("/api/super-admin", superAdminRoutes)

app.use(errorHandler);

// pool.connect()
//   .then(() => console.log('Connected to Render Postgres!'))
//   .catch(err => console.error('Error connecting to Postgres:', err));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
