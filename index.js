require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api', require('./routes/auth'));
app.use('/api', require('./routes/admin'));
app.use('/api', require('./routes/meta'));
app.use('/api', require('./routes/nominations'));
app.use('/api', require('./routes/students'));
app.use('/api', require('./routes/dashboard'));
app.use('/api', require('./routes/export'));

// Multer / general error handler so upload errors come back as clean JSON
app.use((err, req, res, next) => {
  if (err) {
    console.error(err);
    return res.status(400).json({ error: err.message || 'Something went wrong.' });
  }
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Internship Nomination System listening on port ${PORT}`));

module.exports = app;
