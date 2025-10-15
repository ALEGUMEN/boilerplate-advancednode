"use strict";
require("dotenv").config();
const express = require("express");
const myDB = require("./connection");
const fccTesting = require("./freeCodeCamp/fcctesting.js");
const bcrypt = require("bcrypt");
const routes = require("./routes.js");
const auth = require("./auth.js");
const app = express();
const passport = require("passport");
const session = require("express-session");
const { ObjectID } = require("mongodb");
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const passportSocketIo = require("passport.socketio");
const cookieParser = require("cookie-parser");

// 🔹 Configuración de almacenamiento de sesión en Mongo
const MongoStore = require('connect-mongo')(session);
const URI = process.env.MONGO_URI;
const store = new MongoStore({ url: URI });

// 🔹 Motor de plantillas
app.set("view engine", "pug");
app.set("views", "./views/pug");

// 🔹 Inicialización de Passport
app.use(passport.initialize());
app.use(passport.session());

// 🔹 Integración de sesiones con Socket.IO
io.use(
  passportSocketIo.authorize({
    cookieParser: cookieParser,
    key: 'express.sid',
    secret: process.env.SESSION_SECRET,
    store: store,
    success: onAuthorizeSuccess,
    fail: onAuthorizeFail
  })
);

// 🔹 Configuración de sesiones
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    key: "express.sid",
    resave: true,
    store: store,
    saveUninitialized: true,
    cookie: { secure: false },
  }),
);

// 🔹 Callbacks de autorización de socket
function onAuthorizeSuccess(data, accept) {
  console.log('successful connection to socket.io');
  accept(null, true);
}

function onAuthorizeFail(data, message, error, accept) {
  if (error) throw new Error(message);
  console.log('failed connection to socket.io:', message);
  accept(null, false);
}

// 🔹 Conexión a la base de datos
myDB(async (client) => {
  let currentUsers = 0;

  // 🔹 Eventos de conexión de usuarios y mensajes
  io.on('connection', socket => {
    console.log('A user has connected');
    ++currentUsers;
    io.emit('user', {
      username: socket.request.user.username,
      currentUsers,
      connected: true
    });

    socket.on('disconnect', () => {
      console.log('A user disconnected');
      --currentUsers;
      io.emit('user', {
        username: socket.request.user.username,
        currentUsers,
        connected: false
      });
    });

    socket.on('chat message', (message) => {
      io.emit('chat message', {
        username: socket.request.user.username,
        message
      });
    });
  });

  // 🔹 Base de datos de usuarios y rutas
  const myDatabase = await client.db("database").collection("users");
  routes(app, myDatabase);

  app.post(
    "/login",
    passport.authenticate("local", { failureRedirect: "/" }),
    (req, res) => {
      res.redirect("/profile");
      res.render("profile.pug");
    },
  );

  // 🔹 Manejo de rutas no encontradas
  app.use((req, res, next) => {
    res.status(404).type("text").send("Not Found");
  });

  auth(app, myDatabase);

}).catch((e) => {
  console.log("unable to CONNECT");
  app.route("/").get((req, res) => {
    res.render("title", { title: e, message: "Unable to connect to database" });
  });
});

// 🔹 Middleware y archivos estáticos
fccTesting(app);
app.use("/public", express.static(process.cwd() + "/public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔹 Inicio del servidor con http
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log("Listening on port " + PORT);
});

