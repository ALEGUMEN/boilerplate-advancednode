'use strict';
const LocalStrategy = require('passport-local').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const bcrypt = require('bcrypt');
const main = require('./connection');

module.exports = function(passport) {

  // Serialize / deserialize
  passport.serializeUser((user, done) => done(null, user._id));
  passport.deserializeUser((id, done) => {
    main(async (client) => {
      const db = client.db('fcc');
      const myDataBase = db.collection('users');
      const user = await myDataBase.findOne({ _id: id });
      done(null, user);
    }).catch(err => done(err, null));
  });

  // Local strategy
  passport.use(new LocalStrategy((username, password, done) => {
    main(async (client) => {
      const db = client.db('fcc');
      const myDataBase = db.collection('users');
      const user = await myDataBase.findOne({ username });
      if (!user) return done(null, false);
      if (!bcrypt.compareSync(password, user.password)) return done(null, false);
      return done(null, user);
    }).catch(err => done(err));
  }));

  // GitHub strategy
  passport.use(new GitHubStrategy({
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.GITHUB_CALLBACK_URL || "http://localhost:3000/auth/github/callback"
    },
    (accessToken, refreshToken, profile, done) => {
      main(async (client) => {
        const db = client.db('fcc');
        const myDataBase = db.collection('users');
        let user = await myDataBase.findOne({ githubId: profile.id });
        if (!user) {
          const doc = await myDataBase.insertOne({
            githubId: profile.id,
            username: profile.username
          });
          user = doc.ops[0];
        }
        done(null, user);
      }).catch(err => done(err));
    }
  ));
};

