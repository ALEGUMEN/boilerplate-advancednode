'use strict';
const LocalStrategy = require('passport-local');
const GitHubStrategy = require('passport-github');
const bcrypt = require('bcrypt');
const { ObjectId } = require('mongodb');

module.exports = function(passport, myDataBase) {

  // --- Estrategia Local ---
  passport.use(new LocalStrategy((username, password, done) => {
    myDataBase.findOne({ username: username }, (err, user) => {
      if (err) return done(err);
      if (!user) return done(null, false);
      if (!bcrypt.compareSync(password, user.password)) return done(null, false);
      return done(null, user);
    });
  }));

  // --- Estrategia GitHub ---
  passport.use(new GitHubStrategy({
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.GITHUB_CALLBACK_URL
    },
    function(accessToken, refreshToken, profile, done) {
      myDataBase.findOne({ githubId: profile.id }, (err, user) => {
        if (err) return done(err);
        if (user) return done(null, user);
        // Si no existe, insertamos
        myDataBase.insertOne({
          githubId: profile.id,
          username: profile.username
        }, (err, doc) => {
          if (err) return done(err);
          return done(null, doc.ops[0]);
        });
      });
    }
  ));

  // SERIALIZACIÓN
  passport.serializeUser((user, done) => {
    done(null, user._id);
  });

  // DESERIALIZACIÓN
  passport.deserializeUser((id, done) => {
    myDataBase.findOne({ _id: new ObjectId(id) }, (err, doc) => {
      if (err) return done(err, null);
      return done(null, doc);
    });
  });
};
