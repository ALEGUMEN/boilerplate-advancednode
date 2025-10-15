'use strict';
require('dotenv').config();
const express = require('express');
const path = require('path');                 
const session = require('express-session');  
const passport = require('passport');        
const LocalStrategy = require('passport-local'); 
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
  cookie: { secure: false } 
}));
app.use(passport.initialize());
app.use(passport.session());

// --- FreeCodeCamp testing ---
fccTesting(app);

// ---------------------
// Middleware para proteger rutas
// ---------------------
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/');
}

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

  // --- Local Strategy ---
  passport.use(new LocalStrategy((username, password, done) => {
    myDataBase.findOne({ username: username }, (err, user) => {
      console.log(`User ${username} attempted to log in.`);
      if (err) return done(err);
      if (!user) return done(null, false);
      if (password !== user.password) return done(null, false);
      return done(null, user);
    });
  }));

  // SERIALIZACIÓN
  passport.serializeUser((user, done) => {
    done(null, user._id);
  });

  // DESERIALIZACIÓN
  passport.deserializeUser((id, done) => {
    myDataBase.findOne({ _id: new ObjectId(id) }, (err, doc) => {
      if (err) return done(err, null);
      return done(null, doc);
    });
  });

  // RUTA PRINCIPAL
  app.route('/').get((req, res) => {
    res.render('index', {
      title: 'Connected to Database',
      message: 'Please login',
      showLogin: true,
      showRegistration: true
    });
  });

  app.route('/register')
  .post((req, res, next) => {
    myDataBase.findOne({ username: req.body.username }, (err, user) => {
      if (err) {
        next(err);
      } else if (user) {
        res.redirect('/');
      } else {
        myDataBase.insertOne({
          username: req.body.username,
          password: req.body.password
        },
          (err, doc) => {
            if (err) {
              res.redirect('/');
            } else {
              // The inserted document is held within
              // the ops property of the doc
              next(null, doc.ops[0]);
            }
          }
        )
      }
    })
  },
    passport.authenticate('local', { failureRedirect: '/' }),
    (req, res, next) => {
      res.redirect('/profile');
    }
  );
  
  // RUTA /login para autenticar usuario
  app.route('/login').post(
    passport.authenticate('local', { failureRedirect: '/' }),
    (req, res) => {
      res.redirect('/profile');
    }
  );

  // RUTA /profile protegida por middleware
  app.route('/profile').get(ensureAuthenticated, (req, res) => {
    res.render('profile', { username: req.user.username });
  });

  // RUTA /logout
    app.route('/logout')
      .get((req, res) => {
        req.logout();
        res.redirect('/');
    });

  app.use((req, res, next) => {
  res.status(404)
    .type('text')
    .send('Not Found');
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
