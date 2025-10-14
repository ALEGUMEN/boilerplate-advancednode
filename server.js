'use strict';
require('dotenv').config();
const express = require('express');
const path = require('path');                 
const session = require('express-session');  
const passport = require('passport');        
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const { ObjectId } = require('mongodb');

const app = express();

// --- CORS header ---
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

// --- Views ---
app.set('views', path.join(__dirname, 'views/pug'));
app.set('view engine', 'pug');

// --- Middlewares ---
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

  // Inserta un usuario de prueba si la colección está vacía
  const count = await myDataBase.countDocuments();
  if (count === 0) {
    await myDataBase.insertOne({ username: 'alice', password: '12345' });
    console.log('Usuario de prueba insertado');
  }

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
      // Si ocurre un error, lo pasamos; si no, pasamos el doc (aunque sea null)
      if (err) return done(err, null);
      return done(null, doc);
    });
  });

  console.log("✅ Conexión a MongoDB y Passport listos");

}).catch(e => {
  console.error(e);
  app.route('/').get((req, res) => {
    res.render('index', { title: e, message: 'Unable to connect to database' });
  });
});

// --- Escucha del servidor ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('🌐 Servidor escuchando en puerto ' + PORT);
});
