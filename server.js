'use strict';
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const myDB = require('./connection');
const http = require('http');
const socketio = require('socket.io');

const app = express();

// ----------------------
// Middlewares
// ----------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static(path.join(process.cwd(), 'public')));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

// View engine
app.set('views', path.join(__dirname, 'views/pug'));
app.set('view engine', 'pug');

// Session + Passport
app.use(session({
  secret: process.env.SESSION_SECRET || 'putanythinghere',
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false }
}));
app.use(passport.initialize());
app.use(passport.session());

// FCC Testing
fccTesting(app);

// ----------------------
// HTTP + Socket.IO
// ----------------------
const server = http.createServer(app);
const io = socketio(server);

// ----------------------
// Connect to MongoDB
// ----------------------
myDB(async (client) => {
  const myDataBase = client.db('fcc').collection('users');

  // Auth + Routes
  require('./auth.js')(app, myDataBase);
  require('./routes.js')(app, myDataBase);

  // ----------------------
  // Socket.IO connections
  // ----------------------
  let currentUsers = 0;

  io.on('connection', socket => {
  currentUsers++;
  console.log('A user has connected');

  // Emitir evento 'user' al cliente
  io.emit('user', { name: 'A user', currentUsers, connected: true });

  // Escuchar mensajes del cliente
  socket.on('chat message', msg => {
    const userName = socket.request.session?.passport?.user || 'Anonymous';
    io.emit('chat message', { name: userName, message: msg });
  });

    // Manejar desconexión
    socket.on('disconnect', () => {
          currentUsers--;
          io.emit('user', { name: 'A user', currentUsers, connected: false });
    });
  });

}).catch(err => {
  console.error(err);
  app.get('/', (req, res) => res.render('pug', { title: 'Error', message: 'Unable to connect to DB' }));
});

// ----------------------
// Start server
// ----------------------
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));
