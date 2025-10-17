$(document).ready(function() {
  /* global io */
  var socket = io();

  // Add this block to listen for the 'user count' event
  socket.on('user count', function(data) {
    console.log(data); // You can log the data to verify it's received
  });

  // ... (rest of your client-side code)
});

