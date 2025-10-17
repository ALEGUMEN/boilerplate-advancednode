'use strict';

const express       = require('express');
const session       = require('express-session');
const bodyParser    = require('body-parser');
const fccTesting    = require('./freeCodeCamp/fcctesting.js');
const auth          = require('./auth.js');
const routes        = require('./routes.js');
const mongo         = require('mongodb').MongoClient;
const passport      = require('passport');
const cookieParser  = require('cookie-parser');
const cors          = require('cors');
const passportSocketIo = require('passport.socketio');
const MongoStore    = require('connect-mongo')(session);

const app           = express();
const http          = require('http').Server(app);
const io            = require('socket.io')(http);

app.use(cors());
fccTesting(app); // For FCC testing purposes

app.use('/public', express.static(process.cwd() + '/public'));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'pug');

// 🔹 Configurar store de sesiones
const URI = process.env.MONGO_URI;
const store = new MongoStore({ url: URI });

// 🔹 Middleware de sesión
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  key: 'express.sid',
  store: store
}));

// 🔹 Funciones de autorización para Socket.IO
function onAuthorizeSuccess(data, accept) {
  console.log('successful connection to socket.io');
  accept(null, true);
}

function onAuthorizeFail(data, message, error, accept) {
  if (error) throw new Error(message);
  console.log('failed connection to socket.io:', message);
  accept(null, false);
}

// 🔹 Autorización con passport.socketio
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

let currentUsers = 0;

// 🔹 Conexión a Mongo y arranque del servidor
mongo.connect(process.env.MONGO_URI, (err, db) => {
  if (err) {
    console.log('Database error: ' + err);
    return;
  }

  auth(app, db);
  routes(app, db);

  http.listen(process.env.PORT || 3000, () => {
    console.log('Listening on port ' + (process.env.PORT || 3000));
  });

  // 🔹 Código de socket.io
    io.on('connection', (socket) => {
    console.log('user ' + socket.request.user.username + ' connected');

    ++currentUsers;
    io.emit('user', {
      username: socket.request.user.username,
      currentUsers,
      connected: true
    });

    socket.on('disconnect', () => {
      console.log('user ' + socket.request.user.username + ' disconnected');
      --currentUsers;
      io.emit('user', {
        username: socket.request.user.username,
        currentUsers,
        connected: false
      });
    });
  });
});
