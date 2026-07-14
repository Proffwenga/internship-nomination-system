require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();

// Behind Nginx + Cloudflare — trust the proxy chain so req.protocol reflects the real client request
app.set('trust proxy', true);

const CANONICAL_HOST = 'internships.royalmedia.co.ke';

// The app is only "live" at https://internships.royalmedia.co.ke. Anything that arrives via
// the bare server IP, any other hostname, or plain HTTP gets redirected here.
app.use((req, res, next) => {
  const host = (req.headers.host || '').split(':')[0];
  if (host !== CANONICAL_HOST || req.protocol !== 'https') {
    return res.redirect(301, `https://${CANONICAL_HOST}${req.originalUrl}`);
  }
  next();
});

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
