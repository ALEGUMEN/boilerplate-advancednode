$(document).ready(function() {
  /* global io */
  var socket = io();

  $('form').submit(function() {
    var messageToSend = $('#m').val();
    $('#m').val('');
    return false;
  });

  // 🔹 Escuchar evento 'user'
  socket.on('user', data => {
    $('#num-users').text(data.currentUsers + ' users online');
    let message =
      data.username +
      (data.connected ? ' has joined the chat.' : ' has left the chat.');
    $('#messages').append($('<li>').html('<b>' + message + '</b>'));
  });
});

