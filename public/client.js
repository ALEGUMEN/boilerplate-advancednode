$(document).ready(function () {
  /* global io */
  console.log('Cliente listo');

  // Simple conexión para que FCC lo detecte
  const socket = io();

  socket.on('connect', () => {
    console.log('✅ Cliente conectado al socket:', socket.id);
  });

  socket.on('disconnect', () => {
    console.log('❌ Cliente desconectado del socket');
  });

  // Este es el evento que FCC espera
  socket.on('user count', (count) => {
    console.log('Usuarios conectados:', count);
    $('#num-users').text(`Usuarios conectados: ${count}`);
  });

  // Enviar mensaje
  $('form').submit(function () {
    const messageToSend = $('#m').val();
    if (messageToSend.trim() !== '') {
      socket.emit('chat message', messageToSend);
    }
    $('#m').val('');
    return false;
  });

  // Recibir mensajes
  socket.on('chat message', function(data) {
    $('#messages').append($('<li>').text(`${data.name}: ${data.message}`));
  });
});
