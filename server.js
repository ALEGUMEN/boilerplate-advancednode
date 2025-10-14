'use strict';
require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const { ObjectId } = require('mongodb'); // Correcto: ObjectId
const app = express();

// --- Middlewares base ---
app.set('views', path.join(__dirname, 'views/pug'));
app.set('view engine', 'pug');

app.use('/public', express.static(process.cwd() + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Sesión y Passport ---
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false } // true solo si usas HTTPS
}));

app.use(passport.initialize());
app.use(passport.session());

// --- FreeCodeCamp testing ---
fccTesting(app);

// -----------------------------------------------------------
// 🔹 Conexión a base de datos + rutas + Passport
// -----------------------------------------------------------
myDB(async client => {
  const myDataBase = await client.db('fcc').collection('users');

  // RUTA PRINCIPAL
  app.route('/').get((req, res) => {
    res.render('index', {
      title: 'Connected to Database',
      message: 'Please login'
    });
  });

  // SERIALIZACIÓN
  passport.serializeUser((user, done) => {
    done(null, user._id);
  });

  // DESERIALIZACIÓN
  passport.deserializeUser((id, done) => {
    myDataBase.findOne({ _id: new ObjectId(id) }, (err, doc) => {
      if (err) return done(err);
      done(null, doc); // ✅ doc real, no null
    });
  });

  console.log("✅ Conexión a MongoDB y Passport listos");

}).catch(e => {
  console.error(e);
  // Si la base de datos falla:
  app.route('/').get((req, res) => {
    res.render('index', { title: e, message: 'Unable to connect to database' });
  });
});

// --- Escucha del servidor fuera del bloque ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('🌐 Servidor escuchando en puerto ' + PORT);
});
