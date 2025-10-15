'use strict';
const bcrypt = require('bcrypt');
const passport = require('passport');

module.exports = function(app, myDataBase) {

  // Middleware para proteger rutas
  function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect('/');
  }

  // --- RUTA PRINCIPAL ---
  app.route('/').get((req, res) => {
        res.render('index', {
        title: 'Connected to Database',
        message: 'Please login',
        showLogin: true,
        showRegistration: true,
        showSocialAuth: true
    });

  });

  // --- REGISTER ---
  app.route('/register').post(
    (req, res, next) => {
      myDataBase.findOne({ username: req.body.username }, (err, user) => {
        if (err) return next(err);
        if (user) return res.redirect('/');

        const hash = bcrypt.hashSync(req.body.password, 12);
        myDataBase.insertOne({
          username: req.body.username,
          password: hash
        }, (err, doc) => {
          if (err) return res.redirect('/');
          next(null, doc.ops[0]);
        });
      });
    },
    passport.authenticate('local', { failureRedirect: '/' }),
    (req, res) => {
      res.redirect('/profile');
    }
  );

  // --- LOGIN ---
  app.route('/login').post(
    passport.authenticate('local', { failureRedirect: '/' }),
    (req, res) => {
      res.redirect('/profile');
    }
  );

  // --- PROFILE ---
  app.route('/profile').get(ensureAuthenticated, (req, res) => {
    res.render('profile', { username: req.user.username });
  });

  // --- LOGOUT ---
  app.route('/logout').get((req, res, next) => {
    req.logout(err => {
      if (err) return next(err);
      res.redirect('/');
    });
  });

  // --- 404 ---
  app.use((req, res) => {
    res.status(404).type('text').send('Not Found');
  });

};
