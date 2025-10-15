'use strict';
require('dotenv').config();
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GitHubStrategy = require('passport-github').Strategy;
const bcrypt = require('bcrypt');
const ObjectID = require('mongodb').ObjectID;

module.exports = function(app, myDataBase) {

  // ----------------------
  // SERIALIZE / DESERIALIZE
  // ----------------------
  passport.serializeUser((user, done) => done(null, user._id));
  passport.deserializeUser((id, done) => {
    myDataBase.findOne({ _id: new ObjectID(id) }, (err, doc) => {
      if (err) return done(err, null);
      done(null, doc);
    });
  });

  // ----------------------
  // LOCAL STRATEGY
  // ----------------------
  passport.use(new LocalStrategy((username, password, done) => {
    myDataBase.findOne({ username }, (err, user) => {
      if (err) return done(err);
      if (!user) return done(null, false);
      if (!bcrypt.compareSync(password, user.password)) return done(null, false);
      return done(null, user);
    });
  }));

  // ----------------------
  // GITHUB STRATEGY
  // ----------------------
  passport.use(new GitHubStrategy({
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.GITHUB_CALLBACK_URL || "http://localhost:3000/auth/github/callback"
    },
    function(accessToken, refreshToken, profile, cb) {
      console.log('GitHub profile:', profile);
      myDataBase.findOne({ githubId: profile.id }, (err, user) => {
        if (err) return cb(err);
        if (!user) {
          myDataBase.insertOne({
            githubId: profile.id,
            username: profile.username
          }, (err, doc) => {
            if (err) return cb(err);
            return cb(null, doc.ops[0]);
          });
        } else {
          return cb(null, user);
        }
      });
    }
  ));
};
