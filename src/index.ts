import express from 'express';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Accrue AI Backend is running' });
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
