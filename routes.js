const passport = require('passport');

module.exports = function (app, db) {
  
  // Middleware de Autenticación para proteger rutas
  function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    res.redirect('/');
  };

  // 1. Ruta de inicio (Home Page)
  app.route('/')
    .get((req, res) => {
      res.render(process.cwd() + '/views/pug/index', {title: 'Hello', message: 'Please login', showLogin: true, user: req.user});
    });

  // 2. Ruta para iniciar la autenticación con GitHub
  app.route('/auth/github')
    .get(passport.authenticate('github'));

  // 3. Ruta de Callback de GitHub (Maneja la respuesta de GitHub)
  app.route('/auth/github/callback')
    .get(passport.authenticate('github', { failureRedirect: '/' }), (req, res) => {
      // Éxito: Redirigir al perfil
      res.redirect('/profile');
    });

  // 4. Ruta de Perfil (Protegida)
  app.route('/profile')
    .get(ensureAuthenticated, (req, res) => {
      res.render(process.cwd() + '/views/pug/profile', {username: req.user.username});
    });

  // 5. Ruta de Logout
  app.route('/logout')
    .get((req, res) => {
        req.logout((err) => { // Función req.logout() requiere un callback en Express 4.x/Passport 0.6.0+
            if (err) {
                return next(err);
            }
            res.redirect('/');
        });
    });
};