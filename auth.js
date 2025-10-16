const passport = require('passport');
const ObjectID = require('mongodb').ObjectID;
const LocalStrategy = require('passport-local');
const bcrypt = require('bcrypt');
const GitHubStrategy = require('passport-github').Strategy;
const GITHUB_CLIENT_SECRET = process.env['GITHUB_CLIENT_SECRET'];
const GITHUB_CLIENT_ID = process.env['GITHUB_CLIENT_ID'];

module.exports = function (app, myDataBase) {
  passport.serializeUser((user, done) => {
    done(null, user._id);
  });
  passport.deserializeUser((id, done) => {
    myDataBase.findOne({ _id: new ObjectID(id) }, (err, doc) => {
      if (err) return console.error(err);
      done(null, doc);
    });
  });
  
  passport.use(new GitHubStrategy({
    clientID: GITHUB_CLIENT_ID,
    clientSecret: GITHUB_CLIENT_SECRET,
    callbackURL:  process.env.GITHUB_CALLBACK_URL + '/auth/github/callback' ||
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
 