/* global io */
let socket = io(); // <-- esta línea crea la conexión

$(document).ready(function () {
  $('form').submit(function () {
    let messageToSend = $('#m').val();
    socket.emit('chat message', messageToSend); // opcional para mensajes
    $('#m').val('');
    return false; // prevent form submit
  });
});
