const passport = require('passport');
const ObjectID = require('mongodb').ObjectID;
const GitHubStrategy = require('passport-github').Strategy;

const GITHUB_CLIENT_SECRET = process.env['GITHUB_CLIENT_SECRET'];
const GITHUB_CLIENT_ID = process.env['GITHUB_CLIENT_ID'];

module.exports = function (app, myDataBase) {
  // ----------------------
  // Serialize / Deserialize
  // ----------------------
  passport.serializeUser((user, done) => {
    done(null, user._id || user.id);
  });

  passport.deserializeUser((id, done) => {
    myDataBase.findOne({
      $or: [
        { _id: ObjectID.isValid(id) ? new ObjectID(id) : undefined },
        { id: id }
      ]
    }, (err, doc) => {
      if (err) return console.error(err);
      done(null, doc);
    });
  });

  // ----------------------
  // GitHub OAuth
  // ----------------------
  passport.use(new GitHubStrategy({
      clientID: GITHUB_CLIENT_ID,
      clientSecret: GITHUB_CLIENT_SECRET,
      callbackURL: process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/auth/github/callback'
    },
    function(accessToken, refreshToken, profile, cb) {
      // Guardar usuario en la DB
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
        { upsert: true, returnDocument: 'after' }, // <- clave para que devuelva el doc actualizado
        (err, result) => cb(err, result.value)
      );
    }
  ));

  // ----------------------
  // Rutas
  // ----------------------
  app.route('/auth/github')
    .get(passport.authenticate('github'));

  app.route('/auth/github/callback')
    .get(passport.authenticate('github', { failureRedirect: '/' }),
      (req, res) => {
        // ⚡ Guardar user_id en session para Socket.IO
        req.session.user_id = req.user.id || req.user._id;
        res.redirect('/chat'); // <- obligatorio para FCC
      }
    );
}
