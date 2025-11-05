const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors({ origin: '*' }));

let LICENSES = {};
try {
  LICENSES = JSON.parse(fs.readFileSync(path.join(__dirname, 'licenses.json')));
} catch (e) {
  console.error('licenses.json missing');
}

app.post('/validate', (req, res) => {
  const { domain, key } = req.body;
  const store = LICENSES[domain];

  if (!store) return res.json({ valid: false, reason: 'domain' });

  const valid = key === store.key && new Date(store.exp) > new Date();
  console.log(`[KAYZ LOCK] ${domain} → ${valid ? 'UNLOCKED' : 'BLOCKED'}`);

  res.json({ valid });
});

app.get('/', (req, res) => res.send('KAYZ LOCK v3 – PREMIUM'));
app.listen(process.env.PORT || 3000, () => console.log('API LIVE'));
