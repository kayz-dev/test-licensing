const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors({ origin: '*' }));
app.use(express.urlencoded({ extended: true }));

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

// Admin dashboard – Premium Aftertone Studios feel
app.get('/admin', (req, res) => {
  if (req.query.pass !== ADMIN_PASSWORD) {
    return res.status(403).send('<h1>Access Denied</h1><p>Invalid credentials.</p>');
  }

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Aftertone Studios • License Admin</title>
      <style>
        body {
          font-family: 'Helvetica Neue', Arial, sans-serif;
          background: linear-gradient(135deg, #0f0f0f 0%, #111111 100%);
          color: #e0e0e0;
          margin: 0;
          padding: 3rem 2rem;
          min-height: 100vh;
        }
        .container {
          max-width: 900px;
          margin: 0 auto;
        }
        h1 {
          font-size: 2.5rem;
          font-weight: 300;
          letter-spacing: 0.05em;
          color: #ffffff;
          margin-bottom: 0.5rem;
        }
        .subtitle {
          font-size: 1.1rem;
          color: #888;
          margin-bottom: 2.5rem;
        }
        form {
          background: rgba(30,30,30,0.6);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 2.5rem;
          margin-bottom: 3rem;
        }
        label {
          display: block;
          font-size: 0.95rem;
          color: #bbb;
          margin-bottom: 0.5rem;
        }
        input {
          width: 100%;
          padding: 1rem;
          background: rgba(40,40,40,0.7);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          color: #fff;
          font-size: 1rem;
          margin-bottom: 1.5rem;
          transition: border-color 0.3s;
        }
        input:focus {
          outline: none;
          border-color: #ffffff;
        }
        button {
          background: #ffffff;
          color: #000;
          border: none;
          padding: 1rem 2rem;
          font-size: 1.05rem;
          font-weight: 600;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.3s, transform 0.2s;
        }
        button:hover {
          background: #f0f0f0;
          transform: translateY(-2px);
        }
        pre {
          background: rgba(20,20,20,0.8);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 12px;
          padding: 1.5rem;
          font-family: 'Courier New', monospace;
          white-space: pre-wrap;
          overflow: auto;
        }
        a {
          color: #ffffff;
          text-decoration: none;
          opacity: 0.7;
        }
        a:hover { opacity: 1; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Aftertone Studios</h1>
        <p class="subtitle">License Management</p>

        <form action="/admin/add?pass=${ADMIN_PASSWORD}" method="POST">
          <input type="hidden" name="pass" value="${ADMIN_PASSWORD}">
          <label>Store Domain</label>
          <input type="text" name="domain" required placeholder="your-store.myshopify.com">

          <label>Expiration Date</label>
          <input type="date" name="exp" required>

          <label>Themes (comma separated)</label>
          <input type="text" name="themes" required placeholder="core,premium,enterprise">

          <button type="submit">Generate License</button>
        </form>

        <h2 style="font-weight:300;color:#fff;">Active Licenses</h2>
        <pre>${JSON.stringify(LICENSES, null, 2)}</pre>

        <br>
        <a href="/admin?pass=${ADMIN_PASSWORD}">Refresh</a>
      </div>
    </body>
    </html>
  `);
});

// Add new license
app.post('/admin/add', (req, res) => {
  const pass = req.query.pass || req.body.pass;
  if (pass !== ADMIN_PASSWORD) {
    return res.status(403).send('<h1>Access Denied</h1>');
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
    console.log(`[AFTERTONE] Added license for ${normalizedDomain}: ${key}`);

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>License Created</title>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #111; color: #e0e0e0; padding: 4rem 2rem; text-align: center; }
          h1 { font-size: 2.2rem; font-weight: 300; color: #ffffff; }
          p { margin: 1rem 0; font-size: 1.1rem; }
          code { background: #222; padding: 0.4rem 0.8rem; border-radius: 4px; }
          a { color: #ffffff; text-decoration: none; }
        </style>
      </head>
      <body>
        <h1>License Generated</h1>
        <p><strong>Domain:</strong> ${normalizedDomain}</p>
        <p><strong>Key:</strong> <code>${key}</code></p>
        <p><strong>Expiration:</strong> ${exp}</p>
        <p><strong>Themes:</strong> ${themeArray.join(', ')}</p>
        <br>
        <a href="/admin?pass=${ADMIN_PASSWORD}">Back to Admin</a>
      </body>
      </html>
    `);
  } catch (err) {
    res.send('<h1>Error</h1><p>Failed to save.</p><a href="/admin?pass=' + ADMIN_PASSWORD + '">Back</a>');
  }
});

// Validation endpoint – Clean, premium messages
app.post('/validate', (req, res) => {
  const { domain, key, theme } = req.body;

  const normalizedDomain = domain
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');

  const store = LICENSES[normalizedDomain];
  if (!store) {
    console.log(`[AFTERTONE] ${normalizedDomain} → domain not found`);
    return res.json({ valid: false, error: 'Invalid domain (not detected)' });
  }

  const isKeyValid = key === store.key;
  const isNotExpired = new Date(store.exp) > new Date();
  const isThemeValid = store.themes && store.themes.includes(theme);

  const valid = isKeyValid && isNotExpired && isThemeValid;

  console.log(`[AFTERTONE] ${normalizedDomain} / ${theme} → ${valid ? 'UNLOCKED' : 'BLOCKED'}`);

  if (valid) {
    res.json({ valid: true, message: 'License activated successfully' });
  } else {
    let error = 'Invalid license';
    if (!isKeyValid) error = 'Invalid license key';
    else if (!isNotExpired) error = 'License has expired';
    else if (!isThemeValid) error = 'Invalid theme selection';
    res.json({ valid: false, error });
  }
});

app.get('/', (req, res) => res.send('Aftertone Studios – Premium Access'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Aftertone API LIVE on port ${PORT}`));
