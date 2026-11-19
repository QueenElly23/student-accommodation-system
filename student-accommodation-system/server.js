require('dotenv').config();
const path = require('path');
const express = require('express');
const connectDB = require('./config/db');
const apiRoutes = require('./routes');
const { HttpError } = require('./routes/crud');

const app = express();
app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
app.use('/api', apiRoutes);
app.use('/api', (req, res) => res.status(404).json({ error: 'API route not found' }));

// Central error handler
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  let status = 500;
  let message = 'Internal server error';
  if (err instanceof HttpError) { status = err.status; message = err.message; }
  else if (err.name === 'ValidationError') { status = 400; message = Object.values(err.errors).map((e) => e.message).join('; '); }
  else if (err.code === 11000) { status = 409; message = `Duplicate value for: ${Object.keys(err.keyValue || {}).join(', ')}`; }
  else if (err.name === 'CastError') { status = 400; message = `Invalid value for '${err.path}'`; }
  else if (err.type === 'entity.parse.failed') { status = 400; message = 'Malformed JSON body'; }
  else console.error(err);
  res.status(status).json({ error: message });
});

const PORT = process.env.PORT || 3000;
connectDB()
  .then(() => app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`)))
  .catch((err) => {
    console.error('Could not connect to MongoDB:', err.message);
    console.error('Make sure MongoDB is running and MONGO_URI in .env is correct.');
    process.exit(1);
  });
