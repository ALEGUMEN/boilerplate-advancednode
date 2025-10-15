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

// ADDED: Dependencies for Socket.IO Authorization
const passportSocketIo = require('passport.socketio');
const cookieParser = require('cookie-parser');
const MongoStore = require('connect-mongo')(session); // Ensure you have connect-mongo installed

const app = express();

// ----------------------
// Middlewares
// ----------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static(path.join(process.cwd(), 'public')));

// CORS (You had this, but it's typically not needed for same-server socket.io)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

// View engine
app.set('views', path.join(__dirname, 'views')); // Adjusted path to just 'views' for flexibility
app.set('view engine', 'pug');

// Session + Passport
const mySecret = process.env.SESSION_SECRET || 'putanythinghere';
const URI = process.env.MONGO_URI;
const store = new MongoStore({ url: URI }); // Define the store here

app.use(session({
  secret: mySecret,
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false },
  key: 'express.sid', // Set a key for session identifier
  store: store
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

// Define auth success/fail functions for passport.socketio
function onAuthorizeSuccess(data, accept) {
  console.log('successful connection to socket.io');
  accept(null, true);
}

function onAuthorizeFail(data, message, error, accept) {
  if (error) throw new Error(message);
  console.log('failed connection to socket.io:', message);
  accept(null, false);
}

// CRITICAL FIX: Socket.IO authorization middleware
io.use(
  passportSocketIo.authorize({
    cookieParser: cookieParser,
    key: 'express.sid', // Must match the key in app.use(session)
    secret: mySecret,   // Must match the secret in app.use(session)
    store: store,
    success: onAuthorizeSuccess,
    fail: onAuthorizeFail
  })
);


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
  let currentUsers = 0; // Initialize user count outside the connection handler
  
  io.on('connection', socket => {
    console.log('A user has connected');
    ++currentUsers;
    
    // Emit connection event using the user's name from the authenticated socket
    io.emit('user', {
      name: socket.request.user.name,
      currentUsers,
      connected: true
    });

    // Escuchar mensajes del cliente
    socket.on('chat message', message => {
      // Broadcast the message with the authenticated user's name
      io.emit('chat message', { name: socket.request.user.name, message: message });
    });

    // Manejar desconexión
    socket.on('disconnect', () => {
      console.log('A user has disconnected');
      --currentUsers;
      // Emit disconnection event
      io.emit('user', {
        name: socket.request.user.name,
        currentUsers,
        connected: false
      });
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