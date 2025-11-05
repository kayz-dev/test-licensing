const express = require('express');
const app = express();
app.use(express.json());

app.post('/validate', (req, res) => {
  const { key } = req.body;
  res.json({ valid: key === "hello" });  // ← TYPE "hello" IN THEME SETTINGS
});

app.listen(3000);
