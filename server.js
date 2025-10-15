'use strict';
require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const bcrypt = require('bcrypt');
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');

const app = express();

// --- Middlewares ---
app.use('/public', express.static(process.cwd() + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false }
}));
app.use(passport.initialize());
app.use(passport.session());
fccTesting(app);

// --- Views ---
app.set('views', path.join(__dirname, 'views/pug'));
app.set('view engine', 'pug');

// --- Database connection ---
myDB(async client => {
  const myDataBase = await client.db('fcc').collection('users');

  // Usuario de prueba
  const count = await myDataBase.countDocuments();
  if (count === 0) {
    await myDataBase.insertOne({ username: 'alice', password: bcrypt.hashSync('12345', 12) });
    console.log('Usuario de prueba insertado');
  }

  // --- Auth & Routes ---
  require('./auth.js')(passport, myDataBase);
  require('./routes.js')(app, myDataBase);

  console.log('✅ Conexión a MongoDB y Passport listos');

}).catch(e => {
  console.error('❌ Error conectando a la base de datos:', e);
  app.route('/').get((req, res) => {
    res.render('index', { title: e, message: 'Unable to connect to database' });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('🌐 Servidor escuchando en puerto ' + PORT));
