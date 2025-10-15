'use strict';
const LocalStrategy = require('passport-local');
const bcrypt = require('bcrypt');
const { ObjectId } = require('mongodb');

module.exports = function(passport, myDataBase) {

  // --- Local Strategy ---
  passport.use(new LocalStrategy((username, password, done) => {
    myDataBase.findOne({ username: username }, (err, user) => {
      console.log(`User ${username} attempted to log in.`);
      if (err) return done(err);
      if (!user) return done(null, false);
      if (!bcrypt.compareSync(password, user.password)) return done(null, false);
      return done(null, user);
    });
  }));

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
