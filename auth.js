'use strict';
const LocalStrategy = require('passport-local').Strategy;
const GitHubStrategy = require('passport-github').Strategy; // ✅ usar passport-github
const bcrypt = require('bcrypt');
const main = require('./connection');

module.exports = function(passport) {

  // ----------------------
  // SERIALIZE / DESERIALIZE
  // ----------------------
  passport.serializeUser((user, done) => {
    done(null, user._id);
  });

  passport.deserializeUser((id, done) => {
    main(async (client) => {
      const db = client.db('fcc');
      const myDataBase = db.collection('users');
      const user = await myDataBase.findOne({ _id: id });
      done(null, user);
    }).catch(err => done(err, null));
  });

  // ----------------------
  // LOCAL STRATEGY
  // ----------------------
  passport.use(new LocalStrategy((username, password, done) => {
    main(async (client) => {
      const db = client.db('fcc');
      const myDataBase = db.collection('users');

      const user = await myDataBase.findOne({ username: username });
      if (!user) return done(null, false);
      if (!bcrypt.compareSync(password, user.password)) return done(null, false);

      return done(null, user);
    }).catch(err => done(err));
  }));

  // ----------------------
  // GITHUB STRATEGY
  // ----------------------
  passport.use(new GitHubStrategy({
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.GITHUB_CALLBACK_URL || "http://localhost:3000/auth/github/callback"
    },
    function(accessToken, refreshToken, profile, done) {
      main(async (client) => {
        const db = client.db('fcc');
        const myDataBase = db.collection('users');

        // Buscar usuario por githubId
        let user = await myDataBase.findOne({ githubId: profile.id });

        // Si no existe, crearlo
        if (!user) {
          const doc = await myDataBase.insertOne({
            githubId: profile.id,
            username: profile.username
          });
          user = doc.ops[0];
        }

        return done(null, user);
      }).catch(err => done(err));
    }
  ));
};
