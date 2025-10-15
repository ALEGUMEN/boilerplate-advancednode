'use strict';
require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');
const fccTesting = require('./freeCodeCamp/fcctesting.js');

const app = express();

// ----------------------
// CORS
// ----------------------
app.use(cors({
  origin: '*', // o tu frontend específico
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept'],
  credentials: true
}));

// ----------------------
// Views
// ----------------------
app.set('views', path.join(__dirname, 'views/pug'));
app.set('view engine', 'pug');

// ----------------------
// Session + Passport
// ----------------------
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false } // en producción con HTTPS poner true
}));

app.use(passport.initialize());
app.use(passport.session());

// ----------------------
// FCC Testing
// ----------------------
fccTesting(app);

// ----------------------
// Middleware global
// ----------------------
app.use('/public', express.static(path.join(process.cwd(), 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ----------------------
// Import auth routes
// ----------------------
require('./auth.js')(app, passport);

// ----------------------
// 404
// ----------------------
app.use((req, res) => {
  res.status(404).type('text').send('Not Found');
});

// ----------------------
// Puerto
// ----------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});
