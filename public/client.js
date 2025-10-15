$(document).ready(function () {
  /*global io*/
  let socket = io();

  // Mostrar número de usuarios conectados
  socket.on('user', data => {
    $('#num-users').text(data.currentUsers + ' users online');
    let message =
      data.name +
      (data.connected ? ' has joined the chat.' : ' has left the chat.');
    $('#messages').append($('<li>').html('<b>' + message + '</b>'));
  });

  // Mostrar mensajes de chat
  socket.on('chat message', (data) => {
    $('#messages').append($('<li>').text(`${data.name}: ${data.message}`));
  });  

  // Enviar mensaje al servidor
  $('form').submit(function () {
    let messageToSend = $('#m').val();
    if (messageToSend.trim() !== '') {
      socket.emit('chat message', messageToSend);
      $('#m').val('');
    }
    return false; // prevenir refresco de página
  });
});




