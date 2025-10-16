'use strict';

const express      = require('express');
const session      = require('express-session');
const bodyParser   = require('body-parser');
const fccTesting   = require('./freeCodeCamp/fcctesting.js');
const auth         = require('./app/auth.js');
const routes       = require('./app/routes.js');
const mongo        = require('mongodb').MongoClient;
const passport     = require('passport');
const cookieParser = require('cookie-parser');
const cors         = require('cors');
const http         = require('http');           // ✅ use http.createServer
const socketio     = require('socket.io');      // ✅ require socket.io

const app = express();
const sessionStore = new session.MemoryStore();

/* ---------- ENV VARIABLES ----------
SESSION_SECRET=yourSecret
DATABASE=yourMongoURI
GITHUB_CLIENT_ID=yourGithubID
GITHUB_CLIENT_SECRET=yourGithubSecret
------------------------------------ */

app.use(cors());
fccTesting(app); // For FCC tests

// ---------- Middleware ----------
app.use('/public', express.static(process.cwd() + '/public'));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'pug');

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
    key: 'express.sid',
    store: sessionStore,
  })
);

app.use(passport.initialize());
app.use(passport.session());

// ---------- MongoDB + App Setup ----------
mongo.connect(process.env.DATABASE, (err, client) => {
  if (err) {
    console.error('Database error: ' + err);
  } else {
    console.log('Database connection successful');
  }

  const db = client.db('chat'); // Your DB name

  // Import authentication and routes
  auth(app, db);
  routes(app, db);

  // ---------- SOCKET.IO SETUP ----------
  const httpServer = http.createServer(app);   // ✅ create server from app
  const io = socketio(httpServer);             // ✅ attach socket.io to it

  io.on('connection', socket => {
    console.log('A user has connected');
  });

  // ---------- Start Server ----------
  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log('Listening on port ' + PORT);
  });
});
