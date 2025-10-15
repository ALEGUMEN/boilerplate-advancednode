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
  saveUninitialized: true
}));

// Inicialización de Passport
app.use(passport.initialize());
app.use(passport.session());

// Conexión a Mongo y configuración de Passport
myDB(async client => {
  const myDataBase = await client.db('fcc').collection('users');

  auth(app, myDataBase);
  routes(app, myDataBase);

  app.listen(PORT, () => {
    console.log(`✅ Server listening on port ${PORT}`);
  });
}).catch(e => {
  console.error(e);
});