'use strict';
require('dotenv').config();
const express = require('express');
const path = require('path');            
const session = require('express-session');
const passport = require('passport');      
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const { ObjectID } = require('mongodb');
const app = express();

// add this CORS header
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

// Views & view engine (una sola configuración correcta)
app.set('views', path.join(__dirname, 'views/pug'));
app.set('view engine', 'pug');

// --- Session y Passport (IMPORTANTE: antes de fccTesting y antes de las rutas) ---
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false } // en producción con HTTPS pon true
}));

app.use(passport.initialize());
app.use(passport.session());
// -----------------------------------------------------------

fccTesting(app); // For FCC testing purposes

app.use('/public', express.static(process.cwd() + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.route('/').get((req, res) => {
  res.render('index', { title: 'Hello', message: 'Please log in' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});


myDB(async (client) => {
  const db = client.db('fcc');      // <--- Base de datos que creaste
  const usersCollection = db.collection('users'); // <--- Colección 'users'

  // SERIALIZACIÓN
  passport.serializeUser((user, done) => {
    done(null, user._id);
  });

  // DESERIALIZACIÓN
  passport.deserializeUser((id, done) => {
/*    usersCollection.findOne({ _id: new ObjectID(id) }, (err, doc) => {
      done(err, doc);
    });*/
    done(null, null);
  });
  
  console.log("Passport serialization/deserialization ready!");
});
