$(document).ready(function() {
  /* global io */
  var socket = io();

  // 🔥 Escucha los cambios en el conteo de usuarios
  socket.on('user count', function(data) {
    console.log('Current users:', data);
  });

  // Form submission (aún no envías mensajes en este desafío)
  $('form').submit(function() {
    var messageToSend = $('#m').val();
    // Enviar mensaje al servidor (se hará en el siguiente paso)
    $('#m').val('');
    return false; 
  });
});
