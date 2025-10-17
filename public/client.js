/*global io*/
let socket = io(); // conecta el cliente al servidor

// Mostrar número de usuarios conectados
socket.on('user count', (count) => {
  const el = document.getElementById('num-users');
  if(el) el.textContent = `Usuarios conectados: ${count}`;
});

// Escuchar mensajes del chat
socket.on('chat message', (data) => {
  const ul = document.getElementById('messages');
  if (ul) {
    const li = document.createElement('li');
    li.textContent = `${data.name}: ${data.message}`;
    ul.appendChild(li);
  }
});

// Enviar mensaje del formulario
const form = document.querySelector('form');
const input = document.getElementById('m');

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if(input.value) {
    socket.emit('chat message', input.value);
    input.value = '';
  }
});
