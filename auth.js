'use strict';
const passport = require('passport');
const { ObjectId } = require('mongodb');
const LocalStrategy = require('passport-local');
const bcrypt = require('bcrypt');
const GitHubStrategy = require('passport-github').Strategy;

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

module.exports = function (app, myDataBase) {
  // ----------------------
  // SERIALIZE / DESERIALIZE
  // ----------------------
  passport.serializeUser((user, done) => {
    done(null, user._id);
  });

  passport.deserializeUser((id, done) => {
    myDataBase.findOne({ _id: new ObjectId(id) }, (err, doc) => {
      if (err) return console.error(err);
      done(null, doc);
    });
  });

  // ----------------------
  // LOCAL STRATEGY
  // ----------------------
  passport.use(
    new LocalStrategy((username, password, done) => {
      myDataBase.findOne({ username: username }, (err, user) => {
        if (err) return done(err);
        if (!user) return done(null, false);
        if (!bcrypt.compareSync(password, user.password)) return done(null, false);
        return done(null, user);
      });
    })
  );

  // ----------------------
  // GITHUB STRATEGY
  // ----------------------
  passport.use(
    new GitHubStrategy(
      {
        clientID: GITHUB_CLIENT_ID,
        clientSecret: GITHUB_CLIENT_SECRET,
        callbackURL: 'https://boilerplate-advancednode-s02l.onrender.com/auth/github/callback'
      },
      function (accessToken, refreshToken, profile, cb) {
        console.log('GitHub profile:', profile.id);

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
              provider: profile.provider || 'github'
            },
            $set: { last_login: new Date() },
            $inc: { login_count: 1 }
          },
          { upsert: true, new: true },
          (err, doc) => {
            if (err) return cb(err);
            return cb(null, doc.value);
          }
        );
      }
    )
  );
};
