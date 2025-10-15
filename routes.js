const myDB = require("./connection");
const bcrypt = require("bcrypt");
const express = require("express");
const LocalStrategy = require("passport-local");
const passport = require("passport");
const app = express();

module.exports = async (app, myDatabase) => {

  // Página principal
  app.route("/").get((req, res) => {
    res.render("index", {
      title: "Connected to Database",
      message: "Please login",
      showLogin: true,
      showRegistration: true,
      showSocialAuth: true
    });
  });

  // Autenticación con GitHub
  app.route('/auth/github').get(passport.authenticate('github'));
  app.route('/auth/github/callback').get(
    passport.authenticate('github', { failureRedirect: '/' }),
    (req, res) => {
      req.session.user_id = req.user.id;
      res.redirect('/chat');
    }
  );

  // Registro de usuario
  app.route("/register").post(
    (req, res, next) => {
      myDatabase.findOne({ username: req.body.username }, (err, user) => {
        if (err) return next(err);
        if (user) return res.redirect("/");

        const hash = bcrypt.hashSync(req.body.password, 12);
        myDatabase.insertOne(
          { username: req.body.username, password: hash },
          (err, doc) => {
            if (err) return res.redirect("/");
            next(null, doc.ops[0]);
          }
        );
      });
    },

    passport.authenticate("local", { failureRedirect: "/" }, (req, res, next) => {
      bcrypt.compareSync(req.body.password, user.password, (err, result, done) => {
        if (err) return done(null, false);
        if (result) res.redirect("/profile");
      });
    }),
  );

  // Middleware de autenticación
  function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect("/");
  }

  // Chat (solo usuarios autenticados)
  app.route('/chat').get(ensureAuthenticated, (req, res) => {
    res.render('chat.pug', { user: req.user });
  });

  // Perfil (solo usuarios autenticados)
  app.route("/profile").get(ensureAuthenticated, (req, res) => {
    res.render("profile", { username: req.user.username });
  });

  // Cierre de sesión
  app.route("/logout").get((req, res) => {
    req.logout();
    res.redirect("/");
  });
};
