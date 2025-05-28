const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const bcrypt = require('bcrypt');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static('public'));
app.use(express.json());

// File paths
const USERS_FILE = path.join(__dirname, 'users.json');
const TABLES_FILE = path.join(__dirname, 'tables.json');
const HTML_FILES = {
  index: path.join(__dirname, 'public', 'index.html'),
  game: path.join(__dirname, 'public', 'game.html'),
  admin: path.join(__dirname, 'public', 'admin.html')
};

// Initialize data files if they don't exist
if (!fs.existsSync(USERS_FILE)) fs.writeJsonSync(USERS_FILE, []);
if (!fs.existsSync(TABLES_FILE)) fs.writeJsonSync(TABLES_FILE, []);

// Admin credentials (not exposed in client-side code)
const ADMIN_EMAIL = 'robokid1134@gmail.com';
const ADMIN_PASSWORD_HASH = bcrypt.hashSync('P3t3rp@n', 10);

// Routes
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const users = await fs.readJson(USERS_FILE);
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: 'Username taken' });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  users.push({ username, password: hashedPassword, isAdmin: username === ADMIN_EMAIL });
  await fs.writeJson(USERS_FILE, users);
  res.json({ success: true });
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const users = await fs.readJson(USERS_FILE);
  const user = users.find(u => u.username === username);
  if (user && await bcrypt.compare(password, user.password)) {
    res.json({ success: true, isAdmin: user.isAdmin });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.post('/admin/update-html', async (req, res) => {
  const { username, page, content } = req.body;
  const users = await fs.readJson(USERS_FILE);
  const user = users.find(u => u.username === username);
  if (user && user.isAdmin) {
    await fs.writeFile(HTML_FILES[page], content);
    res.json({ success: true });
  } else {
    res.status(403).json({ error: 'Unauthorized' });
  }
});

// Table management
app.post('/create-table', async (req, res) => {
  const { name, isPrivate, username } = req.body;
  const tables = await fs.readJson(TABLES_FILE);
  const tableId = tables.length + 1;
  tables.push({ id: tableId, name, isPrivate, players: [username], creator: username });
  await fs.writeJson(TABLES_FILE, tables);
  res.json({ success: true, tableId });
});

app.get('/tables', async (req, res) => {
  const tables = await fs.readJson(TABLES_FILE);
  res.json(tables.filter(t => !t.isPrivate || t.players.includes(req.query.username)));
});

// Socket.IO for real-time table interactions
io.on('connection', socket => {
  socket.on('join-table', async ({ tableId, username }) => {
    const tables = await fs.readJson(TABLES_FILE);
    const table = tables.find(t => t.id === tableId);
    if (table && (!table.isPrivate || table.creator === username)) {
      table.players.push(username);
      await fs.writeJson(TABLES_FILE, tables);
      socket.join(`table-${tableId}`);
      io.to(`table-${tableId}`).emit('update-players', table.players);
    }
  });

  socket.on('game-action', ({ tableId, action, username }) => {
    io.to(`table-${tableId}`).emit('game-update', { action, username });
  });
});

server.listen(3000, () => console.log('Server running on http://localhost:3000'));
