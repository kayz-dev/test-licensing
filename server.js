const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
app.use(express.json());
app.use(cors({ origin: '*' }));

const licenses = JSON.parse(fs.readFileSync(path.join(__dirname, 'licenses.json')));

app.post('/validate', (req, res) => {
  const { domain, key } = req.body;
  const domainKey = Object.keys(licenses).find(d => domain.includes(d.replace('https://', '').replace('/', '')));
  if (!domainKey) return res.json({ valid: false, reason: 'no_key' });

  const hash = crypto.createHash('md5').update(key).digest('hex');
  const stored = licenses[domainKey];
  const valid = hash === stored.keyHash && new Date(stored.exp) > new Date();

  console.log(`CHECK: ${domain} → hash:${hash} | stored:${stored.keyHash} | valid:${valid}`);
  res.json({ valid });
});

app.listen(process.env.PORT || 3000, () => console.log('API LIVE'));
