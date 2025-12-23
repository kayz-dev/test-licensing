const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors({ origin: '*' }));
app.use(express.urlencoded({ extended: true })); // Add this for form parsing!

// Load licenses
let LICENSES = {};
try {
  LICENSES = JSON.parse(fs.readFileSync(path.join(__dirname, 'licenses.json')));
} catch (e) {
  console.error('licenses.json missing');
}

// Helper: Generate random key (XXXX-XXXX-XXXX-XXXX)
function generateKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key = '';
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (i < 3) key += '-';
  }
  return key;
}

// Admin password (set in Render env vars)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change-this-to-something-secure';

// Admin dashboard (GET)
app.get('/admin', (req, res) => {
  const pass = req.query.pass;
  if (pass !== ADMIN_PASSWORD) {
    return res.status(403).send('<h1>Access Denied</h1><p>Invalid password.</p>');
  }

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>KAYZ LOCK Admin</title>
      <style>
        body { font-family: Arial, sans-serif; background: #111; color: #fff; padding: 2rem; max-width: 800px; margin: 0 auto; }
        h1 { color: #0f0; }
        form { margin: 2rem 0; }
        input, select { padding: 0.8rem; margin: 0.5rem 0; width: 100%; max-width: 400px; box-sizing: border-box; }
        button { padding: 0.8rem 1.5rem; background: #0f0; color: #000; border: none; cursor: pointer; font-weight: bold; }
        button:hover { background: #0d0; }
        pre { background: #222; padding: 1rem; border-radius: 8px; overflow: auto; white-space: pre-wrap; }
        .success { color: #0f0; }
        .error { color: #f00; }
      </style>
    </head>
    <body>
      <h1>KAYZ LOCK Admin</h1>
      <p>Create new licenses instantly.</p>

      <form action="/admin/add?pass=${ADMIN_PASSWORD}" method="POST">
        <input type="hidden" name="pass" value="${ADMIN_PASSWORD}">

        <label for="domain">Store Domain (e.g. mystore.myshopify.com):</label><br>
        <input type="text" id="domain" name="domain" required placeholder="your-store.myshopify.com"><br><br>

        <label for="exp">Expiration Date:</label><br>
        <input type="date" id="exp" name="exp" required><br><br>

        <label for="themes">Themes (comma separated):</label><br>
        <input type="text" id="themes" name="themes" required placeholder="core,premium,enterprise"><br><br>

        <button type="submit">Generate & Add License</button>
      </form>

      <h2>Current Licenses</h2>
      <pre>${JSON.stringify(LICENSES, null, 2)}</pre>

      <br>
      <a href="/admin?pass=${ADMIN_PASSWORD}" style="color:#0f0;">Refresh</a>
    </body>
    </html>
  `);
});

// Add new license (POST)
app.post('/admin/add', (req, res) => {
  const pass = req.query.pass || req.body.pass;
  if (pass !== ADMIN_PASSWORD) {
    return res.status(403).send('<h1>Access Denied</h1><p>Invalid password.</p>');
  }

  const { domain, exp, themes } = req.body;
  if (!domain || !exp || !themes) {
    return res.send('<h1>Error</h1><p>All fields required.</p><a href="/admin?pass=' + ADMIN_PASSWORD + '">Back</a>');
  }

  const normalizedDomain = domain.trim().toLowerCase();
  const key = generateKey();
  const themeArray = themes.split(',').map(t => t.trim());

  LICENSES[normalizedDomain] = {
    key,
    exp,
    themes: themeArray
  };

  try {
    fs.writeFileSync(path.join(__dirname, 'licenses.json'), JSON.stringify(LICENSES, null, 2));
    console.log(`[KAYZ LOCK] Added license for ${normalizedDomain}: ${key}`);

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head><meta charset="UTF-8"><title>Success</title>
      <style>body{font-family:Arial,sans-serif;background:#111;color:#fff;padding:2rem;}</style></head>
      <body>
        <h1 class="success">License Created Successfully!</h1>
        <p><strong>Domain:</strong> ${normalizedDomain}</p>
        <p><strong>License Key:</strong> <code>${key}</code></p>
        <p><strong>Expiration:</strong> ${exp}</p>
        <p><strong>Themes:</strong> ${themeArray.join(', ')}</p>
        <br>
        <a href="/admin?pass=${ADMIN_PASSWORD}" style="color:#0f0;">Back to Admin</a>
      </body>
      </html>
    `);
  } catch (err) {
    res.send('<h1>Error</h1><p>Failed to save license.</p><p>' + err.message + '</p><a href="/admin?pass=' + ADMIN_PASSWORD + '">Back</a>');
  }
});

// Your validation endpoint
app.post('/validate', (req, res) => {
  const { domain, key, theme } = req.body;

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
