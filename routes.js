'use strict';
const passport = require('passport');
const bcrypt = require('bcrypt');

module.exports = function (app, myDataBase) {
  // Middleware para proteger rutas
  function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    res.redirect('/');
  }

  // Página principal
  app.route('/').get((req, res) => {
    res.render('index', {
      title: 'Connected to Database',
      message: 'Please login',
      showLogin: true,
      showRegistration: true,
      showSocialAuth: true,
    });
  });

  // 🔐 Login local
  app.route('/login').post(
    passport.authenticate('local', { failureRedirect: '/' }),
    (req, res) => {
      res.redirect('/profile');
    }
  );

  // 📝 Registro de usuario
  app.route('/register').post((req, res, next) => {
    myDataBase.findOne({ username: req.body.username }, (err, user) => {
      if (err) return next(err);
      if (user) return res.redirect('/');

      const hash = bcrypt.hashSync(req.body.password, 12);

      myDataBase.insertOne(
        { username: req.body.username, password: hash },
        (err, doc) => {
          if (err) return res.redirect('/');
          // ✅ Passport necesita el documento insertado
          next(null, doc);
        }
      );
    });
  },
  passport.authenticate('local', { failureRedirect: '/' }),
  (req, res) => res.redirect('/profile')
  );

  // 👤 Perfil del usuario (requiere sesión)
  app.route('/profile').get(ensureAuthenticated, (req, res) => {
    res.render('profile', { username: req.user.username });
  });

  // 🌐 Autenticación con GitHub
  app.route('/auth/github').get(passport.authenticate('github'));

  app.route('/auth/github/callback').get(
    passport.authenticate('github', { failureRedirect: '/' }),
    (req, res) => {
      res.redirect('/profile');
    }
  );

  // 🚪 Logout (Passport 0.6+ requiere callback)
  app.route('/logout').get((req, res, next) => {
    req.logout(function (err) {
      if (err) return next(err);
      res.redirect('/');
    });
  });

  // ❌ Ruta 404
  app.use((req, res) => {
    res.status(404).type('text').send('Not Found');
  });
};
