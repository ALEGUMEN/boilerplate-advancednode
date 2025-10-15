'use strict';
const bcrypt = require('bcrypt');
const main = require('./connection');

module.exports = function(app, passport) {

  function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect('/');
  }

  // Home
  app.get('/', (req, res) => {
    res.render('index', {
      title: 'Connected to Database',
      message: 'Please login',
      showLogin: true,
      showRegistration: true,
      showSocialAuth: true,
      user: req.user,
    });
  });

  // Login local
  app.post('/login',
    passport.authenticate('local', { failureRedirect: '/' }),
    (req, res) => res.redirect('/profile')
  );

  // Register local
  app.post('/register', (req, res, next) => {
    main(async (client) => {
      const db = client.db('fcc');
      const myDataBase = db.collection('users');
      const user = await myDataBase.findOne({ username: req.body.username });
      if (user) return res.redirect('/');
      const hash = bcrypt.hashSync(req.body.password, 12);
      const doc = await myDataBase.insertOne({ username: req.body.username, password: hash });
      req.login(doc.ops[0], err => {
        if (err) return next(err);
        res.redirect('/profile');
      });
    }).catch(err => next(err));
  });

  // Profile
  app.get('/profile', ensureAuthenticated, (req, res) => {
    res.render('profile', { username: req.user.username });
  });

  // GitHub OAuth
  app.get('/auth/github', passport.authenticate('github'));
  app.get('/auth/github/callback',
    passport.authenticate('github', { failureRedirect: '/' }),
    (req, res) => res.redirect('/profile')
  );

  // Logout
  app.get('/logout', (req, res, next) => {
    req.logout(err => {
      if (err) return next(err);
      res.redirect('/');
    });
  });
};
