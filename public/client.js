// public/client.js

$(document).ready(function () {
  /*global io*/
  let socket = io();

  // CRITICAL: The server sends a 'user' event upon connection/disconnection
  socket.on('user', data => {
    $('#num-users').text(data.currentUsers + ' users online');
    let message =
      data.name +
      (data.connected ? ' has joined the chat.' : ' has left the chat.');
    $('#messages').append($('<li>').html('<b>' + message + '</b>'));
  });

  // CRITICAL: The server sends a 'chat message' event
  socket.on('chat message', (data) => {
    $('#messages').append($('<li>').text(`${data.name}: ${data.message}`));
  });

  // Form submittion with new message in field with id 'm'
  $('form').submit(function () {
    var messageToSend = $('#m').val();

    // The client must emit 'chat message' with the message content
    socket.emit('chat message', messageToSend);
    $('#m').val('');
    return false; // prevent form submit from refreshing page
  });
});



