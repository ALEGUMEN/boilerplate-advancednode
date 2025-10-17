$(document).ready(function () {
  /* global io */
  console.log('Cliente listo');

  const socket = io({
    transports: ['websocket', 'polling'],
    secure: true,
    reconnection: true,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    console.log('✅ Cliente conectado al socket:', socket.id);
  });

  socket.on('disconnect', () => {
    console.log('❌ Cliente desconectado del socket');
  });

  socket.on('user count', (count) => {
    $('#num-users').text(`Usuarios conectados: ${count}`);
  });

  $('form').submit(function () {
    const messageToSend = $('#m').val();
    socket.emit('chat message', messageToSend);
    $('#m').val('');
    return false;
  });
});
