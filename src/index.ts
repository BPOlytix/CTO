import express from 'express';
import xeroRouter from './api/xero.js';
import assistantRouter from './api/assistant.js';
import billsRouter from './api/bills.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Accrue AI Backend is running' });
});

app.use('/api/xero', xeroRouter);
app.use('/api/assistant', assistantRouter);
app.use('/api/bills', billsRouter);

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
