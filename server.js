'use strict';
require('dotenv').config();
const express = require('express');
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const session = require('express-session');
const passport = require('passport');
const path = require('path');

// Socket.IO dependencies
const passportSocketIo = require('passport.socketio');
const cookieParser = require('cookie-parser');
const MongoStore = require('connect-mongo')(session);

const app = express();

// ----------------------
// HTTP + Socket.IO
// ----------------------
const http = require('http').createServer(app);
const io = require('socket.io')(http);

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
app.set('views', path.join(__dirname, 'views', 'pug'));
app.set('view engine', 'pug');

// ----------------------
// Session + Passport
// ----------------------
const mySecret = process.env.SESSION_SECRET || 'putanythinghere';
const URI = process.env.MONGO_URI;

const store = new MongoStore({
  url: URI,
  touchAfter: 24 * 3600 // evita problemas de expiración
});

app.use(session({
  secret: mySecret,
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false },
  key: 'express.sid', 
  store: store
}));

app.use(passport.initialize());
app.use(passport.session());

// FCC Testing
fccTesting(app);

// ----------------------
// Socket.IO Authorization
// ----------------------
function onAuthorizeSuccess(data, accept) {
  console.log('Successful connection to socket.io');
  accept(null, true);
}

function onAuthorizeFail(data, message, error, accept) {
  if (error) throw new Error(message);
  console.log('Failed connection to socket.io:', message);
  accept(null, false);
}

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
  // Socket.IO events
  // ----------------------
  let currentUsers = 0;

  io.on('connection', socket => {
    console.log('A user has connected');

    ++currentUsers;
    io.emit('user count', currentUsers);
    
    //opcional
    const name = (socket.request.user && socket.request.user.name) 
                  ? socket.request.user.name 
                  : 'Anonymous';

    io.emit('user', {
      name,
      currentUsers,
      connected: true
    });

    socket.on('chat message', message => {
      io.emit('chat message', { name, message });
    });

    socket.on('disconnect', () => {
      console.log('A user has disconnected');
      --currentUsers;
      io.emit('user count', currentUsers); // actualizar contador
      io.emit('user', {
        name,
        currentUsers,
        connected: false
      });
    });
  });

}).catch(err => {
  console.error(err);
  app.get('/', (req, res) => 
    res.render('pug', { title: 'Error', message: 'Unable to connect to DB' })
);
});

// ----------------------
// Start server
// ----------------------
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Listening on port ${PORT}`));
