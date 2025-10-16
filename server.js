'use strict';
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const myDB = require('./connection');

// --- Dependencias de Socket.IO y Sesiones ---
const passportSocketIo = require('passport.socketio');
const cookieParser = require('cookie-parser');
// Nota: La versión de connect-mongo puede requerir cambios si Node o Mongoose son muy nuevos.
const MongoStore = require('connect-mongo')(session); 

const app = express();

// --- HTTP + Socket.IO: CORRECTO ---
const http = require('http').createServer(app); 
const io = require('socket.io')(http); 

// --- Configuración de Express ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static(path.join(process.cwd(), 'public')));
app.set('views', path.join(__dirname, 'views', 'pug'));
app.set('view engine', 'pug');

// Middleware para confiar en el proxy de Render (CRUCIAL para HTTPS y sesiones)
app.set('trust proxy', 1); // 1 = El proxy de Render

// --- Sesión + Passport ---
const mySecret = process.env.SESSION_SECRET || 'putanythinghere';
const URI = process.env.MONGO_URI;
const store = new MongoStore({ url: URI }); 

app.use(session({
    secret: mySecret,
    resave: true,
    saveUninitialized: true,
    cookie: { 
        secure: process.env.NODE_ENV === 'production' ? true : false, // Usar 'true' en Render
        maxAge: 1000 * 60 * 60 * 24 // 24 horas
    },
    key: 'express.sid', 
    store: store
}));
app.use(passport.initialize());
app.use(passport.session());

// FCC Testing
fccTesting(app);

// --- Middleware de Autorización de Socket.IO ---
function onAuthorizeSuccess(data, accept) {
    console.log('successful connection to socket.io');
    accept(null, true);
}

function onAuthorizeFail(data, message, error, accept) {
    if (error) throw new Error(message);
    console.log('failed connection to socket.io:', message);
    accept(null, false);
}

io.use(
    passportSocketIo.authorize({
        cookieParser: cookieParser,
        key: 'express.sid', 
        secret: mySecret,   
        store: store,
        success: onAuthorizeSuccess,
        fail: onAuthorizeFail
    })
);

// --- Conexión a MongoDB ---
myDB(async (client) => {
    const myDataBase = client.db('fcc').collection('users');

    // --- Auth + Rutas ---
    require('./auth.js')(app, myDataBase);
    require('./routes.js')(app, myDataBase);

    // --- Conexiones de Socket.IO ---
    let currentUsers = 0; 

    io.on('connection', socket => {
        // Lógica de conexión y desconexión
        currentUsers++;
        const name = (socket.request.user && socket.request.user.name) ? socket.request.user.name : 'Anonymous';
        
        io.emit('user', {
            name,
            currentUsers,
            connected: true
        });

        socket.on('chat message', message => {
            io.emit('chat message', { name, message });
        });

        socket.on('disconnect', () => {
            console.log('A user has disconnected');
            currentUsers--;
            io.emit('user', {
                name,
                currentUsers,
                connected: false
            });
        });
    });

}).catch(err => {
    console.error(err);
    // Manejo de errores de conexión a DB
    app.get('/', (req, res) => res.render('pug', { title: 'Error', message: 'Unable to connect to DB' }));
});

// --- Iniciar Servidor: CORRECTO ---
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Listening on port ${PORT}`));