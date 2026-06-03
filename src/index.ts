import express from 'express';
import xeroRouter from './api/xero.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Accrue AI Backend is running' });
});

app.use('/api/xero', xeroRouter);

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
