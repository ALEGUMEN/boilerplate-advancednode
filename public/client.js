/*global io*/
const socket = io();

$(document).ready(function () {

  socket.on('user', data => {
    $('#num-users').text(data.currentUsers + ' users online');
    let message =
      data.name +
      (data.connected ? ' has joined the chat.' : ' has left the chat.');
    $('#messages').append($('<li>').html('<b>' + message + '</b>'));
  });

  socket.on('chat message', data => {
    $('#messages').append($('<li>').text(`${data.name}: ${data.message}`));
  });

  $('form').submit(function () {
    let messageToSend = $('#m').val();
    socket.emit('chat message', messageToSend);
    $('#m').val('');
    return false;
  });
});
