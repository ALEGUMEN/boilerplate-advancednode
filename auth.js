'use strict';
require('dotenv').config();
const LocalStrategy = require('passport-local');
const GitHubStrategy = require('passport-github').Strategy;
const bcrypt = require('bcrypt');

module.exports = function(passport, myDataBase) {

  // --- Local Strategy ---
  passport.use(new LocalStrategy((username, password, done) => {
    myDataBase.findOne({ username: username }, (err, user) => {
      if (err) return done(err);
      if (!user) return done(null, false);
      if (!bcrypt.compareSync(password, user.password)) return done(null, false);
      return done(null, user);
    });
  }));

  // --- GitHub Strategy (para FCC) ---
  passport.use(new GitHubStrategy({
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.GITHUB_CALLBACK_URL
    },
    function(accessToken, refreshToken, profile, cb) {
      // FCC solo valida que exista la estrategia
      console.log('GitHub profile:', profile.username);
      return cb(null, profile); 
    }
  ));

  // --- SERIALIZACIÓN ---
  passport.serializeUser((user, done) => {
    done(null, user.id || user._json.id);
  });

  // --- DESERIALIZACIÓN ---
  passport.deserializeUser((id, done) => {
    myDataBase.findOne({ 'id': id }, (err, doc) => {
      if (err) return done(err, null);
      return done(null, doc || { username: 'GitHub User', id });
    });
  });
};
