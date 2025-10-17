const passport = require('passport');
const bcrypt = require('bcrypt');

// 🔒 Middleware para proteger rutas
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/');
}

module.exports = function (app, myDataBase) {
  // 🏠 Página principal
  app.route('/')
    .get((req, res) => {
      res.render('index', {
        title: 'Connected to Database',
        message: 'Please login',
        showLogin: true,
        showRegistration: true,
        showSocialAuth: true
      });
    });

  // 🔑 Login local
  app.route('/login')
    .post(
      passport.authenticate('local', { failureRedirect: '/' }),
      (req, res) => res.redirect('/profile')
    );

  // 👤 Perfil (solo autenticados)
  app.route('/profile')
    .get(ensureAuthenticated, (req, res, next) => {
      try {
        res.render('profile', { 
          username: req.user && (req.user.username || req.user.name) 
        });
      } catch (err) {
        console.error('Error en /profile:', err);
        next(err);
      }
    });

  // 🧑‍💻 Autenticación con GitHub
  app.route('/auth/github')
    .get(passport.authenticate('github'));

  // 🔁 Callback de GitHub (setea sesión + redirige al chat)
  app.route('/auth/github/callback')
    .get(
      passport.authenticate('github', { failureRedirect: '/' }),
      (req, res) => {
        req.session.user_id = req.user.id;
        res.redirect('/chat');
      }
    );

  // 💬 Chat (solo usuarios autenticados)
  app.route('/chat')
    .get(ensureAuthenticated, (req, res) => {
      res.render('chat', { user: req.user });
    });

  // 📝 Registro de usuario
  app.route('/register')
    .post((req, res, next) => {
      const hash = bcrypt.hashSync(req.body.password, 12);
      myDataBase.findOne({ username: req.body.username }, (err, user) => {
        if (err) return next(err);
        if (user) return res.redirect('/');

        myDataBase.insertOne({ username: req.body.username, password: hash }, (err, doc) => {
          if (err) return res.redirect('/');

          // Loguear automáticamente el usuario recién creado
          req.login(doc.ops[0], (err) => {
            if (err) return next(err);
            res.redirect('/profile');
          });
        });
      });
    });

  // 🚪 Logout (compatible con Passport >= 0.6)
  app.route('/logout')
    .get((req, res, next) => {
      req.logout(err => {
        if (err) return next(err);
        res.redirect('/');
      });
    });

  // ⚠️ 404 - Ruta no encontrada
  app.use((req, res) => res.status(404).type('text').send('Not Found'));
};
