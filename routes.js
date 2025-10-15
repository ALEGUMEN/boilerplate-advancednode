'use strict';
const passport = require('passport');
const bcrypt = require('bcrypt');

module.exports = function(app, myDataBase) {

  function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect('/');
  }

  // ----------------------
  // HOME
  // ----------------------
  app.get('/', (req, res) => {
    res.render('pug', {
      title: 'Connected to Database',
      message: 'Please login',
      showLogin: true,
      showRegistration: true,
      showSocialAuth: true,
      user: req.user
    });
  });

  // ----------------------
  // LOGIN LOCAL
  // ----------------------
  app.post('/login', passport.authenticate('local', { failureRedirect: '/' }),
    (req, res) => res.redirect('/profile')
  );

  // ----------------------
  // REGISTER LOCAL
  // ----------------------
  app.post('/register', (req, res, next) => {
    const hash = bcrypt.hashSync(req.body.password, 12);
    myDataBase.findOne({ username: req.body.username }, (err, user) => {
      if (err) return next(err);
      if (user) return res.redirect('/');
      myDataBase.insertOne({ username: req.body.username, password: hash }, (err, doc) => {
        if (err) return next(err);
        req.login(doc.ops[0], err => {
          if (err) return next(err);
          res.redirect('/profile');
        });
      });
    });
  });

  // ----------------------
  // PROFILE
  // ----------------------
  app.get('/profile', ensureAuthenticated, (req, res) => {
    res.render('pug/profile', { username: req.user.username });
  });

  // ----------------------
  // CHAT (nuevo)
  // ----------------------
  app.get('/chat', ensureAuthenticated, (req, res) => {
    res.render('pug/chat', { user: req.user });
  });

  // ----------------------
  // LOGOUT
  // ----------------------
  app.get('/logout', (req, res, next) => {
    req.logout(err => {
      if (err) return next(err);
      res.redirect('/');
    });
  });

  // ----------------------
  // GITHUB OAUTH
  // ----------------------
  app.get('/auth/github', passport.authenticate('github'));
  app.get('/auth/github/callback',
    passport.authenticate('github', { failureRedirect: '/' }),
    (req, res) => {
      // Guardar user_id en session y redirigir a chat
      req.session.user_id = req.user.id;
      res.redirect('/chat');
    }
  );

  // ----------------------
  // 404
  // ----------------------
  app.use((req, res) => {
    res.status(404).type('text').send('Not Found');
  });

};
