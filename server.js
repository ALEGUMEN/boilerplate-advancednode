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
fccTesting(app);
app.use('/public', express.static(path.join(process.cwd(), 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ----------------------
// MongoStore
// ----------------------
let store;
try {
  const MongoStore = require('connect-mongo');
  if (typeof MongoStore.create === 'function') {
    store = MongoStore.create({ mongoUrl: process.env.MONGO_URI });
  } else {
    const MongoStoreOld = require('connect-mongo')(session);
    store = new MongoStoreOld({ url: process.env.MONGO_URI });
  }
} catch (err) {
  console.error('Error initializing connect-mongo:', err);
  store = null;
}

// ----------------------
// Session + Passport
// ----------------------
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: true,
  saveUninitialized: true,
  key: 'express.sid',
  store: store
});

app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

// ----------------------
// HTTP + Socket.IO
// ----------------------
const httpServer = http.createServer(app);
const io = socketio(httpServer);

io.use(
  passportSocketIo.authorize({
    cookieParser: cookieParser,
    key: 'express.sid',
    secret: process.env.SESSION_SECRET || 'secret',
    store: store,
    success: onAuthorizeSuccess,
    fail: onAuthorizeFail
  })
);

// ----------------------
// Database + Routes
// ----------------------
let currentUsers = 0;

myDB(async (client) => {
  const myDataBase = await client.db('fcc').collection('users');
  routes(app, myDataBase);
  auth(app, myDataBase);

  io.on('connection', (socket) => {
    currentUsers++;
    console.log('User connected:', socket.id);

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
      io.emit('user', {
        name: socket.request.user ? socket.request.user.name : 'Anonymous',
        currentUsers,
        connected: false
      });
    });
  });
}).catch((e) => {
  console.error('Database error:', e);
  app.get('/', (req, res) => {
    res.render('pug', { title: e, message: 'Unable to connect to database' });
  });
});

function onAuthorizeSuccess(data, accept) {
  console.log('Socket.io auth success');
  accept(null, true);
}

function onAuthorizeFail(data, message, error, accept) {
  if (error) throw new Error(message);
  console.log('Socket.io auth fail:', message);
  accept(null, false);
}

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log('Listening on port ' + PORT));

