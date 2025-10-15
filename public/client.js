/* global io */
'use strict';

// Conexión inmediata con el servidor
const socket = io();

socket.on('connect', () => {
  console.log('Connected to server, id:', socket.id);
});

$(document).ready(function () {
  // Mostrar número de usuarios conectados
  socket.on('user', (data) => {
    $('#num-users').text(data.currentUsers + ' users online');
    let message = data.name + (data.connected ? ' joined.' : ' left.');
    $('#messages').append($('<li>').html('<b>' + message + '</b>'));
  });

  // Mostrar mensajes de chat
  socket.on('chat message', (data) => {
    $('#messages').append($('<li>').text(`${data.name}: ${data.message}`));
  });

  // Enviar mensajes
  $('form').submit(function (e) {
    e.preventDefault();
    const messageToSend = $('#m').val();
    if (messageToSend.trim() !== '') {
      socket.emit('chat message', messageToSend);
      $('#m').val('');
    }
  });
});




