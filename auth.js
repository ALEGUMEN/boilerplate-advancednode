const passport = require("passport");
const GitHubStrategy = require("passport-github");
require("dotenv").config();
const LocalStrategy = require("passport-local");
const { ObjectID } = require("mongodb");

module.exports = (app, myDatabase) => {

  // Estrategia de autenticación con GitHub
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env["GITHUB_CLIENT_ID"],
        clientSecret: process.env["GITHUB_CLIENT_SECRET"],
        callbackURL: 'https://boilerplate-advancednode-s02l.onrender.com/auth/github/callback'
      },
      function (accessToken, refreshToken, profile, cb) {
        console.log(profile);
        // Inserta o actualiza usuario en base de datos
        myDatabase.findOneAndUpdate(
          { id: profile.id },
          {
            $setOnInsert: {
              id: profile.id,
              username: profile.username,
              name: profile.displayName || "John Doe",
              photo: profile.photos?.[0]?.value || "",
              email: Array.isArray(profile.emails)
                ? profile.emails[0].value
                : "No public email",
              created_on: new Date(),
              provider: profile.provider || "",
            },
            $set: { last_login: new Date() },
            $inc: { login_count: 1 },
          },
          { upsert: true, new: true },
          (err, doc) => cb(null, doc.value)
        );
      }
    )
  );

  // Serialización de usuario
  passport.serializeUser((user, done) => done(null, user._id));

  // Deserialización de usuario
  passport.deserializeUser((id, done) => {
    myDatabase.findOne({ _id: new ObjectID(id) }, (err, doc) => done(null, doc));
  });

  // Estrategia local (login con usuario y contraseña)
  passport.use(
    new LocalStrategy((username, password, done) => {
      myDatabase.findOne({ username }, (err, user) => {
        console.log(`User ${username} attempted to log in.`);
        if (err) return done(err);
        if (!user || password !== user.password) return done(null, false);
        return done(null, user);
      });
    })
  );
};
