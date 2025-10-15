'use strict';
require('dotenv').config();
const express = require('express');
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const session = require('express-session');
const passport = require('passport');
const mySecret = process.env['SESSION_SECRET'];
const routes = require('./routes.js');
const auth = require('./auth.js');

const app = express();

// 1. ADDED/CORRECTED: Require/Instantiate http and socket.io
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.set('view engine', 'pug');

// ... (other requires)

io.use(
  passportSocketIo.authorize({
    cookieParser: cookieParser,
    key: 'express.sid',
    secret: process.env.SESSION_SECRET,
    store: store,
    success: onAuthorizeSuccess,
    fail: onAuthorizeFail
  })
);

myDB(async (client) => {
  const myDataBase = await client.db('database').collection('users');

  routes(app, myDataBase);
  auth(app, myDataBase);

  // 3. ADDED: Socket.IO connection listener inside the database connection
  io.on('connection', socket => {
    let currentUsers = 0;
    console.log('A user has connected');
    ++currentUsers;
    io.emit('user', {
      name: socket.request.user.name,
      currentUsers,
      connected: true
    });
    socket.on('chat message', (message) =>{
      io.emit('chat message', { name: socket.request.user.name, message });
    });

    socket.on('disconnect', () => {
      /*anything you want to do on disconnect*/
      console.log('A user has disconnected');
      --currentUsers;
      io.emit('user', {
        name: socket.request.user.name,
        currentUsers,
        connected: false
      });
    }); 
  });
}).catch((e) => {
  app.route('/').get((req, res) => {
    res.render('pug', { title: e, message: 'Unable to login' });
  });
});

function onAuthorizeSuccess(data, accept) {
  console.log('successful connection to socket.io');

  accept(null, true);
}

function onAuthorizeFail(data, message, error, accept) {
  if (error) throw new Error(message);
  console.log('failed connection to socket.io:', message);
  accept(null, false);
}

// 2. ALTERED: http.listen instead of app.listen
http.listen(process.env.PORT || 3000, () => {
  console.log('Listening on port ' + process.env.PORT);
});