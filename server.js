'use strict';
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const mongo = require('mongodb').MongoClient;
const routes = require('./routes.js');
const auth = require('./auth.js');
const app = express();
const http = require('http').Server(app);

// Conexión a la base de datos (MongoDB)
mongo.connect(process.env.DATABASE, (err, client) => {
    if (err) {
        console.log('Database error: ' + err);
    } else {
        console.log('Successful database connection');

        const db = client.db('fcc-advancednode'); // Reemplaza con el nombre de tu base de datos

        app.use('/public', express.static(process.cwd() + '/public'));
        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded({ extended: true }));
        app.set('view engine', 'pug');

        // Configuración de sesiones
        app.use(session({
          secret: process.env.SESSION_SECRET,
          resave: true,
          saveUninitialized: true,
          cookie: { secure: false }
        }));
        
        // Inicialización de Passport
        app.use(passport.initialize());
        app.use(passport.session());

        // Carga y configuración de Passport (estrategias y serialización)
        auth(app, db);
        
        // Carga y conexión de rutas
        routes(app, db); 

        // Manejo de error 404
        app.use((req, res, next) => {
          res.status(404).sendFile(process.cwd() + '/views/404.html');
        });

        const PORT = process.env.PORT || 3000;
        http.listen(PORT, () => {
          console.log('Listening on port ' + PORT);
        });
    }
});