const passport = require('passport');
const ObjectID = require('mongodb').ObjectID;
const LocalStrategy = require('passport-local');
const bcrypt = require('bcrypt');
const GitHubStrategy = require('passport-github').Strategy;
const GITHUB_CLIENT_SECRET = process.env['GITHUB_CLIENT_SECRET'];
const GITHUB_CLIENT_ID = process.env['GITHUB_CLIENT_ID'];

module.exports = function (app, myDataBase) {
  passport.serializeUser((user, done) => {
    // Si el usuario tiene _id (local), usa ese. Si tiene id (GitHub), usa ese.
    done(null, user._id || user.id);
  });
  passport.deserializeUser((id, done) => {
    // Intenta buscar por _id (local) y por id (GitHub)
    myDataBase.findOne({ $or: [
      { _id: ObjectID.isValid(id) ? new ObjectID(id) : undefined },
      { id: id }
    ] }, (err, doc) => {
      if (err) return console.error(err);
      done(null, doc);
    });
  });
    // Ruta para iniciar login con GitHub
    app.route('/auth/github')
      .get(passport.authenticate('github'));

    // Ruta para el callback de GitHub
    app.route('/auth/github/callback')
      .get(passport.authenticate('github', {
        failureRedirect: '/'
      }), (req, res) => {
        res.redirect('/profile');
      });
  
  passport.use(new GitHubStrategy({
    clientID: GITHUB_CLIENT_ID,
    clientSecret: GITHUB_CLIENT_SECRET,
    callbackURL:  process.env.GITHUB_CALLBACK_URL ||
  'http://localhost:3000/auth/github/callback'
  },
    function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    myDataBase.findOneAndUpdate(
      { id: profile.id },
      {
        $setOnInsert: {
          id: profile.id,
          name: profile.displayName || 'John Doe',
          photo: profile.photos?.[0]?.value || '',
          email: Array.isArray(profile.emails)
            ? profile.emails[0].value
            : 'No public email',
          created_on: new Date(),
          provider: profile.provider || ''
        },
        $set: { last_login: new Date() },
        $inc: { login_count: 1 }
      },
      { upsert: true, new: true },
      (err, doc) => cb(null, doc.value)
    );
  }
));
}
 