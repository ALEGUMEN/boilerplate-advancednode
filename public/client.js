// /public/client.js
const socket = io();

// Contador de usuarios y mensaje de conexión/desconexión
socket.on('user', data => {
  document.getElementById('num-users').textContent =
    data.currentUsers + ' users online';
  
  const li = document.createElement('li');
  li.innerHTML = `<b>${data.name}${data.connected ? ' has joined the chat.' : ' has left the chat.'}</b>`;
  document.getElementById('messages').appendChild(li);
});

// Escuchar mensajes
socket.on('chat message', data => {
  const li = document.createElement('li');
  li.textContent = `${data.name}: ${data.message}`;
  document.getElementById('messages').appendChild(li);
});

// Enviar mensajes
document.querySelector('form').addEventListener('submit', e => {
  e.preventDefault();
  const input = document.getElementById('m');
  if (input.value) {
    socket.emit('chat message', input.value);
    input.value = '';
  }
});
