$(document).ready(function () {
  /*global io*/

  console.log('Cliente: document ready'); // pista inicial

  // Conexión al servidor Socket.IO
  let socket;
  try {
    socket = io();
    console.log('Cliente: objeto socket creado', socket);
  } catch (err) {
    console.error('Cliente: error al crear socket', err);
  }

  // Evento de conexión
  if (socket) {
    socket.on('connect', () => {
      console.log('Cliente conectado al socket con id:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('Cliente desconectado del socket');
    });

    // Escuchar conteo de usuarios
    socket.on('user count', (count) => {
      console.log('Usuarios conectados:', count);
      $('#num-users').text(`Usuarios conectados: ${count}`);
    });

    // Escuchar mensajes del chat
    socket.on('chat message', (data) => {
      console.log('Mensaje recibido:', data);
      $('#messages').append($('<li>').text(`${data.name}: ${data.message}`));
    });
  }

  // Form submit con mensaje
  $('form').submit(function () {
    const messageToSend = $('#m').val();
    console.log('Cliente: enviando mensaje ->', messageToSend);

    if (socket) socket.emit('chat message', messageToSend);

    $('#m').val('');
    return false; // prevenir refresco de la página
  });
});
