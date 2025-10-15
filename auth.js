'use strict';
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const { ObjectId } = require('mongodb');

module.exports = function (passport, myDataBase) {
  // --- Estrategia Local ---
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log(`User ${username} attempted to log in.`);
        const user = await myDataBase.findOne({ username: username });

        if (!user) {
          console.log('Usuario no encontrado.');
          return done(null, false, { message: 'Usuario no encontrado' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
          console.log('Contraseña incorrecta.');
          return done(null, false, { message: 'Contraseña incorrecta' });
        }

        return done(null, user);
      } catch (err) {
        console.error('Error en LocalStrategy:', err);
        return done(err);
      }
    })
  );

  // --- Serialización ---
  passport.serializeUser((user, done) => {
    done(null, user._id);
  });

  // --- Deserialización ---
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await myDataBase.findOne({ _id: new ObjectId(id) });
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
};

