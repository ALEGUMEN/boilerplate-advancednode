const passport = require('passport');
const bcrypt = require('bcrypt');

module.exports = function (app, myDataBase) {
  app.route('/').get((req, res) => {
    res.render('pug', {
      title: 'Connected to Database',
      message: 'Please login',
      showLogin: true,
      showRegistration: true,
      showSocialAuth: true
    });
  });

  app.route('/login').post(
    passport.authenticate('local', { failureRedirect: '/' }),
    (req, res) => {
      res.redirect('/profile');
    }
  );

  app.route('/profile').get(ensureAuthenticated, (req, res, next) => {
    try {
      res.render('profile', { username: req.user.username || req.user.name });
    } catch (err) {
      console.error('Error en /profile:', err);
      next(err);
    }
  });

  // ✅ Route for /chat, protected and passes user
  app.route('/chat').get((req, res) => {
    res.render('chat', { user: req.user || {} });
  });

  // ✅ Logout (fixed for Passport >=0.6)
  app.route('/logout').get((req, res, next) => {
    req.logout(err => {
      if (err) return next(err);
      res.redirect('/');
    });
  });

  // ✅ Registration route
  app.route('/register').post(
    (req, res, next) => {
      const hash = bcrypt.hashSync(req.body.password, 12);
      myDataBase.findOne({ username: req.body.username }, function (err, user) {
        if (err) return next(err);
        if (user) return res.redirect('/');
        myDataBase.insertOne(
          { username: req.body.username, password: hash },
          (err, doc) => {
            if (err) return res.redirect('/');
            next(null, doc.ops[0]);
          }
        );
      });
    },
    passport.authenticate('local', { failureRedirect: '/' }),
    (req, res) => res.redirect('/profile')
  );

  app.route('/auth/github').get(passport.authenticate('github'));

  // ✅ GitHub callback (sets session + redirects to chat)
  app.route('/auth/github/callback').get(
    passport.authenticate('github', { failureRedirect: '/' }),
    (req, res) => {
      req.session.user_id = req.user.id;
      res.redirect('/chat');
    }
  );

  // 404
  app.use((req, res) => res.status(404).type('text').send('Not Found'));
};

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/');
}
