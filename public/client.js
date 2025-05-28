const socket = io();
let currentUser = null;

async function login() {
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  const response = await fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await response.json();
  if (data.success) {
    currentUser = username;
    if (data.isAdmin) document.getElementById('admin-link').style.display = 'block';
    window.location.href = '/game.html';
  } else {
    alert(data.error);
  }
}

async function register() {
  const username = document.getElementById('register-username').value;
  const password = document.getElementById('register-password').value;
  const response = await fetch('/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await response.json();
  if (data.success) {
    alert('Registered! Please login.');
  } else {
    alert(data.error);
  }
}

async function createTable() {
  const name = document.getElementById('table-name').value;
  const isPrivate = document.getElementById('is-private').checked;
  const response = await fetch('/create-table', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, isPrivate, username: currentUser })
  });
  const data = await response.json();
  if (data.success) {
    joinTable(data.tableId);
  }
}

async function loadTables() {
  const response = await fetch(`/tables?username=${currentUser}`);
  const tables = await response.json();
  const tableList = document.getElementById('table-list');
  tableList.innerHTML = tables.map(t => `<button onclick="joinTable(${t.id})">${t.name} (${t.isPrivate ? 'Private' : 'Public'})</button>`).join('');
}

async function joinTable(tableId) {
  socket.emit('join-table', { tableId, username: currentUser });
  document.getElementById('game-area').style.display = 'block';
  document.getElementById('table-name-display').textContent = `Table ${tableId}`;
}

function performAction(action) {
  socket.emit('game-action', { tableId: currentTableId, action, username: currentUser });
}

async function updateHtml() {
  const page = document.getElementById('page-select').value;
  const content = document.getElementById('html-content').value;
  const response = await fetch('/admin/update-html', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: currentUser, page, content })
  });
  const data = await response.json();
  alert(data.success ? 'HTML updated' : data.error);
}

socket.on('update-players', players => {
  document.getElementById('players').textContent = `Players: ${players.join(', ')}`;
});

socket.on('game-update', ({ action, username }) => {
  alert(`${username} performed ${action}`);
});

if (window.location.pathname === '/game.html') {
  loadTables();
}
