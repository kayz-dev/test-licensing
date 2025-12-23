const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors({ origin: '*' })); // Allows Shopify pages to connect

let LICENSES = {};
try {
  LICENSES = JSON.parse(fs.readFileSync(path.join(__dirname, 'licenses.json')));
} catch (e) {
  console.error('licenses.json missing');
}

app.post('/validate', (req, res) => {
  const { domain, key, theme } = req.body;

  // Normalize domain (remove https:// and trailing slash)
  const normalizedDomain = domain
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');

  const store = LICENSES[normalizedDomain];
  if (!store) {
    console.log(`[KAYZ LOCK] ${normalizedDomain} → domain not found`);
    return res.json({ valid: false, reason: 'domain' });
  }

  const isKeyValid = key === store.key;
  const isNotExpired = new Date(store.exp) > new Date();
  const isThemeValid = store.themes && store.themes.includes(theme);

  const valid = isKeyValid && isNotExpired && isThemeValid;

  console.log(`[KAYZ LOCK] ${normalizedDomain} / ${theme} → ${valid ? 'UNLOCKED' : 'BLOCKED'}`);

  if (valid) {
    res.json({ valid: true, message: 'License activated successfully' });
  } else {
    let reason = 'invalid';
    if (!isKeyValid) reason = 'key';
    else if (!isNotExpired) reason = 'expired';
    else if (!isThemeValid) reason = 'theme';
    res.json({ valid: false, reason });
  }
});

app.get('/', (req, res) => res.send('KAYZ LOCK v3 – PREMIUM'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API LIVE on port ${PORT}`));
