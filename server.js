'use strict';
require('dotenv').config();
const express = require('express');
const passport = require('passport');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const myDB = require('./connection');
const routes = require('./routes');
const auth = require('./auth');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const cors = require('cors');
const path = require('path');

const app = express();

// ✅ Middleware base
fccTesting(app);
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Configuración de la vista con Pug
app.set('view engine', 'pug');

// ✅ Conexión y configuración principal
myDB(async client => {
  const db = await client.db('fcc');
  const usersCollection = await db.collection('users');

  // ✅ Sesiones con almacenamiento en MongoDB
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'keyboard cat',
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
        dbName: 'fcc',
        collectionName: 'sessions'
      }),
      cookie: { secure: false } // poner true si usas HTTPS
    })
  );

  // ✅ Configurar Passport
  auth(passport, usersCollection);
  app.use(passport.initialize());
  app.use(passport.session());

  // ✅ Rutas
  routes(app, passport);

  // ✅ Inicio del servidor
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Listening on port ${port}`);
  });
}).catch(e => {
  console.error('Error: Unable to Connect to Database');
  console.error(e);
});
