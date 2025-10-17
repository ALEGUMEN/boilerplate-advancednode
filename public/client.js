$(document).ready(function() {
  /* global io */
  var socket = io();

  // 🟢 Enviar mensaje cuando se envía el formulario
  $('form').submit(function() {
    var messageToSend = $('#m').val();
    socket.emit('chat message', messageToSend); // <--- aquí
    $('#m').val('');
    return false; // evitar refresh
  });

  // 🟢 Escuchar cuando se conecta o desconecta un usuario
  socket.on('user', data => {
    $('#num-users').text(data.currentUsers + ' users online');
    let message =
      data.username +
      (data.connected ? ' has joined the chat.' : ' has left the chat.');
    $('#messages').append($('<li>').html('<b>' + message + '</b>'));
  });

  // 🟢 Escuchar los mensajes del chat
  socket.on('chat message', data => {
    $('#messages').append($('<li>').text(data.username + ': ' + data.message));
  });
});
