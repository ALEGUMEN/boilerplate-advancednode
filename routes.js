'use strict';
const bcrypt = require('bcrypt');

module.exports = function (app, myDataBase, passport) {

  // Middleware para verificar si el usuario está autenticado
  function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    res.redirect('/login');
  }

  // --- Página principal protegida ---
  app.route('/')
    .get(ensureAuthenticated, (req, res) => {
      res.render('index', { title: 'Home', user: req.user });
    });

  // --- Página de login ---
  app.route('/login')
    .get((req, res) => {
      res.render('login', { title: 'Login' });
    })
    .post(
      passport.authenticate('local', { failureRedirect: '/login' }),
      (req, res) => {
        res.redirect('/');
      }
    );

  // --- Registro de nuevos usuarios ---
  app.route('/register')
    .get((req, res) => {
      res.render('register', { title: 'Registro' });
    })
    .post(async (req, res, next) => {
      try {
        const user = await myDataBase.findOne({ username: req.body.username });
        if (user) {
          console.log('El usuario ya existe.');
          return res.redirect('/login');
        }

        const hash = await bcrypt.hash(req.body.password, 12);
        const newUser = { username: req.body.username, password: hash };

        const insertResult = await myDataBase.insertOne(newUser);
        const insertedUser = insertResult.insertedId
          ? await myDataBase.findOne({ _id: insertResult.insertedId })
          : null;

        if (!insertedUser) return res.redirect('/register');
        req.login(insertedUser, (err) => {
          if (err) return next(err);
          return res.redirect('/');
        });
      } catch (err) {
        console.error('Error en registro:', err);
        return next(err);
      }
    });

  // --- Logout ---
  app.route('/logout')
    .get((req, res) => {
      req.logout((err) => {
        if (err) console.error('Error al cerrar sesión:', err);
        res.redirect('/login');
      });
    });

  // --- Ruta para manejar 404 ---
  app.use((req, res) => {
    res.status(404)
      .type('text')
      .send('Página no encontrada');
  });
};
