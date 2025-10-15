/*global io*/
$(document).ready(function () {
  // Conexión a Socket.IO
  let socket = io();

  const $form = $('form');
  const $input = $('#m');
  const $messages = $('#messages');
  const $numUsers = $('#num-users');

  // ----------------------
  // Enviar mensaje
  // ----------------------
  $form.submit(function (e) {
    e.preventDefault();
    const messageToSend = $input.val();
    if (messageToSend) {
      socket.emit('chat message', messageToSend); // enviar al servidor
      $input.val(''); // limpiar input
    }
    return false;
  });

  // ----------------------
  // Recibir mensaje
  // ----------------------
  socket.on('chat message', function (msg) {
    $messages.append($('<li>').text(msg));
    $messages.scrollTop($messages[0].scrollHeight); // scroll al final
  });

  // ----------------------
  // Mostrar número de usuarios conectados
  // ----------------------
  socket.on('user count', function (count) {
    $numUsers.text(`Usuarios conectados: ${count}`);
  });
});
