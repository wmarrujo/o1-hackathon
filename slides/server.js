const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;
const DECKS_DIR = path.join(__dirname, 'decks');

app.use(express.static(path.join(__dirname, 'public')));

// List all decks
app.get('/api/decks', (req, res) => {
  const files = fs.readdirSync(DECKS_DIR).filter(f => f.endsWith('.md'));
  res.json(files.map(f => ({ name: f.replace('.md', ''), file: f })));
});

// Serve raw markdown for a deck
app.get('/api/decks/:name', (req, res) => {
  const file = path.join(DECKS_DIR, req.params.name + '.md');
  if (!fs.existsSync(file)) return res.status(404).send('Not found');
  res.type('text/plain').send(fs.readFileSync(file, 'utf8'));
});

app.listen(PORT, () => {
  console.log(`Slides server running at http://localhost:${PORT}`);
});
