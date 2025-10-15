'use strict';
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const myDB = require('./connection');

// ADDED: Dependencies for Socket.IO Authorization
const passportSocketIo = require('passport.socketio');
const cookieParser = require('cookie-parser');
const MongoStore = require('connect-mongo')(session); 

const app = express(); // <-- APP DEFINED FIRST

// ----------------------
// HTTP + Socket.IO (Correct instantiation for the challenge)
// ----------------------
const http = require('http').createServer(app); // Uses the app instance
const io = require('socket.io')(http); // Binds socket.io to the http server
// ----------------------

// ... (The rest of your middleware setup)

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
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Session + Passport
const mySecret = process.env.SESSION_SECRET || 'putanythinghere';
const URI = process.env.MONGO_URI;
const store = new MongoStore({ url: URI }); 

app.use(session({
  secret: mySecret,
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false },
  key: 'express.sid', // Using express.sid as it was in your previous attempt
  store: store
}));
app.use(passport.initialize());
app.use(passport.session());

// FCC Testing
fccTesting(app);

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

// Socket.IO authorization middleware
io.use(
  passportSocketIo.authorize({
    cookieParser: cookieParser,
    key: 'express.sid', 
    secret: mySecret,   
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
  // CRITICAL FIX: Initialize currentUsers inside the DB block to ensure persistence
  let currentUsers = 0; 

  io.on('connection', socket => {
    console.log('A user has connected');
    currentUsers++;
    
    // Emit connection event
    io.emit('user', {
      name: socket.request.user.name,
      currentUsers,
      connected: true
    });

    // Escuchar mensajes del cliente
    socket.on('chat message', message => {
      io.emit('chat message', { name: socket.request.user.name, message: message });
    });

    // Manejar desconexión
    socket.on('disconnect', () => {
      console.log('A user has disconnected');
      currentUsers--;
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
// Start server (Uses the 'http' server created at the top)
// ----------------------
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Listening on port ${PORT}`));