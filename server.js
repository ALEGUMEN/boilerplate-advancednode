'use strict';
require('dotenv').config();

const path = require('path');
const express = require('express');
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const session = require('express-session');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const passportSocketIo = require('passport.socketio');
const MongoStore = require('connect-mongo');

const routes = require('./routes.js');
const auth = require('./auth.js');

const app = express();
const http = require('http').createServer(app);
const socketIO = require('socket.io');
const io = socketIO(http);

// ----------------------
// Config / Middlewares
// ----------------------
app.set('views', path.join(__dirname, 'views/pug'));
app.set('view engine', 'pug');

fccTesting(app);
app.use('/public', express.static(path.join(process.cwd(), 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

const SESSION_SECRET = process.env.SESSION_SECRET || 'putanythinghere';

// create MongoStore (connect-mongo v4+)
const store = MongoStore.create({ mongoUrl: process.env.MONGO_URI });

// session (single initialization)
app.use(session({
  secret: SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false },
  name: 'express.sid', // cookie name
  store: store
}));

app.use(passport.initialize());
app.use(passport.session());

// CORS (simple)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

// ----------------------
// passport.socketio authorize
// ----------------------
io.use(passportSocketIo.authorize({
  cookieParser: cookieParser, // function
  key: 'express.sid',         // same as session.name
  secret: SESSION_SECRET,
  store: store,
  success: onAuthorizeSuccess,
  fail: onAuthorizeFail
}));

// ----------------------
// Socket.IO users counter (persistente)
// ----------------------
let currentUsers = 0;

// ----------------------
// Connect to MongoDB and wire routes + socket handlers
// ----------------------
myDB(async (client) => {
  const myDataBase = client.db('database').collection('users');

  // register auth & routes (these call passport config internally)
  auth(app, myDataBase);
  routes(app, myDataBase);

  // Socket.IO connection handler
  io.on('connection', (socket) => {
    currentUsers++;
    console.log('A user has connected — currentUsers:', currentUsers);

    // Emitir info de usuario conectado
    io.emit('user', {
      name: socket.request.user && socket.request.user.name ? socket.request.user.name : 'Anonymous',
      currentUsers,
      connected: true
    });

    // Escuchar mensajes de clientes
    socket.on('chat message', (message) => {
      const sender = socket.request.user && socket.request.user.name ? socket.request.user.name : 'Anonymous';
      io.emit('chat message', { name: sender, message });
    });

    // Desconexión
    socket.on('disconnect', () => {
      currentUsers--;
      console.log('A user has disconnected — currentUsers:', currentUsers);
      io.emit('user', {
        name: socket.request.user && socket.request.user.name ? socket.request.user.name : 'Anonymous',
        currentUsers,
        connected: false
      });
    });
  });

}).catch((e) => {
  console.error(e);
  app.route('/').get((req, res) => {
    res.render('pug', { title: e, message: 'Unable to login' });
  });
});

// ----------------------
// Passport.socketio callbacks
// ----------------------
function onAuthorizeSuccess(data, accept) {
  console.log('successful connection to socket.io');
  accept(null, true);
}

function onAuthorizeFail(data, message, error, accept) {
  if (error) {
    console.error('passport.socketio authorize error:', message);
    return accept(new Error(message), false);
  }
  console.log('failed connection to socket.io:', message);
  accept(null, false);
}

// ----------------------
// Start server
// ----------------------
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});
