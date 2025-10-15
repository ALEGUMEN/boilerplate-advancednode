'use strict';
require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const myDB = require('./connection');
const routes = require('./routes.js');
const auth = require('./auth.js');
const http = require('http');
const socketio = require('socket.io');
const cookieParser = require('cookie-parser');
const passportSocketIo = require('passport.socketio');

const app = express();

// ----------------------
// View engine
// ----------------------
app.set('views', path.join(__dirname, 'views/pug'));
app.set('view engine', 'pug');

// ----------------------
// Middlewares
// ----------------------
fccTesting(app); // FreeCodeCamp testing
app.use('/public', express.static(path.join(process.cwd(), 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ----------------------
// MongoStore compatible con v2/v3/v4+
// ----------------------
let store;
try {
  const MongoStore = require('connect-mongo');
  if (typeof MongoStore.create === 'function') {
    // API moderna v4+
    store = MongoStore.create({ mongoUrl: process.env.MONGO_URI });
  } else {
    // API antigua v2/v3
    const MongoStoreOld = require('connect-mongo')(session);
    store = new MongoStoreOld({ url: process.env.MONGO_URI });
  }
} catch (err) {
  console.error('Error al inicializar connect-mongo store:', err);
  store = null;
}

// ----------------------
// Session + Passport
// ----------------------
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'putanythinghere',
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false },
  name: 'express.sid',
  store: store
});

app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

// ----------------------
// CORS
// ----------------------
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  );
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

// ----------------------
// HTTP + Socket.IO
// ----------------------
const server = http.createServer(app);
const io = socketio(server);

// Passport Socket.IO authorization
io.use(
  passportSocketIo.authorize({
    cookieParser: cookieParser,
    key: 'express.sid',
    secret: process.env.SESSION_SECRET || 'putanythinghere',
    store: store,
    success: onAuthorizeSuccess,
    fail: onAuthorizeFail
  })
);

// ----------------------
// MongoDB + Routes
// ----------------------
let currentUsers = 0;

myDB(async (client) => {
  const myDataBase = client.db('fcc').collection('users');

  routes(app, myDataBase);
  auth(app, myDataBase);

  // ----------------------
  // Socket.IO connections
  // ----------------------
  io.on('connection', (socket) => {
    currentUsers++;
    console.log('A user has connected — currentUsers:', currentUsers);

    io.emit('user', {
      name: socket.request.user ? socket.request.user.name : 'Anonymous',
      currentUsers,
      connected: true
    });

    socket.on('chat message', (message) => {
      io.emit('chat message', {
        name: socket.request.user ? socket.request.user.name : 'Anonymous',
        message
      });
    });

    socket.on('disconnect', () => {
      currentUsers--;
      console.log('A user has disconnected — currentUsers:', currentUsers);
      io.emit('user', {
        name: socket.request.user ? socket.request.user.name : 'Anonymous',
        currentUsers,
        connected: false
      });
    });
  });
}).catch((err) => {
  console.error('Error conectando a la DB:', err);
  app.get('/', (req, res) => {
    res.render('pug', { title: 'Error', message: 'Unable to connect to DB' });
  });
});

// ----------------------
// Passport Socket.IO callbacks
// ----------------------
function onAuthorizeSuccess(data, accept) {
  console.log('successful connection to socket.io');
  accept(null, true);
}

function onAuthorizeFail(data, message, error, accept) {
  if (error) throw new Error(message);
  console.log('failed connection to socket.io:', message);
  accept(null, false);
}

// ----------------------
// Start server
// ----------------------
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));
