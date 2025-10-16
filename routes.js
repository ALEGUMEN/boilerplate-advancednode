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
  app.route('/login').post(passport.authenticate('local', { failureRedirect: '/' }), (req, res) => {
    res.redirect('/profile');
  });
  app.route('/profile').get(ensureAuthenticated, (req, res) => {
    res.render('profile', { username: req.user.username });

  });
  
  // ADDED: New GET route for /chat, renders 'chat.pug'
  app.route('/chat').get(ensureAuthenticated, (req, res) => {
    res.render('chat', { user: req.user }); 
  });  

    app.route('/logout').get((req, res, next) => {
    req.logout(err => {
      if (err) return next(err);
      res.redirect('/');
    });
  });

  app.route('/register').post(
    (req, res, next) => {
      const hash = bcrypt.hashSync(req.body.password, 12);
      myDataBase.findOne({ username: req.body.username }, function(err, user) {
        if (err) {
          next(err);
        } else if (user) {
          res.redirect('/');
        } else {
          myDataBase.insertOne({ username: req.body.username, password: hash }, (err, doc) => {
            if (err) {
              res.redirect('/');
            } else {
              next(null, doc.ops[0]);
            }
          });
        }
      });
    },
    passport.authenticate('local', { failureRedirect: '/' }),
    (req, res, next) => {
      res.redirect('/profile');
    }
  );
    app.use((req, res, next) => {
    res.status(404).type('text').send('Not Found')
  });
  app.route('/auth/github').get(passport.authenticate('github'));
  
  // ALTERED: /auth/github/callback route to set session and redirect to /chat
  app.route('/auth/github/callback').get(passport.authenticate('github', { failureRedirect: '/'}), (req, res) => {
    req.session.user_id = req.user.id; 
    res.redirect('/chat'); 
  });

};

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/');
};