require('dotenv').config();
const { createDb } = require('./db');
const { createApp } = require('./app');

const port = process.env.PORT || 4000;
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('JWT_SECRET must be set in production');
  process.exit(1);
}
createApp(createDb()).listen(port, () => console.log(`Lead Manager API listening on :${port}`));
