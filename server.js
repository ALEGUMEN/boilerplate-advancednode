'use strict';
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const myDB = require('./connection');

// ADDED: Dependencies for Socket.IO Authorization
const passportSocketIo = require('passport.socketio');
const cookieParser = require('cookie-parser');
const MongoStore = require('connect-mongo')(session); 

const app = express();

// --- CRITICAL FIX: INSTANTIATION ---
// Define http and io immediately after app
const http = require('http').createServer(app); 
const io = require('socket.io')(http); 

// ----------------------
// Middlewares and Setup
// ----------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static(path.join(process.cwd(), 'public')));

// View engine
app.set('views', './views'); // Simple path setting
app.set('view engine', 'pug');

// Session + Passport Setup
const mySecret = process.env.SESSION_SECRET || 'putanythinghere';
const URI = process.env.MONGO_URI;
const store = new MongoStore({ url: URI }); 

app.use(session({
    secret: mySecret,
    resave: true,
    saveUninitialized: true,
    cookie: { secure: false },
    key: 'express.sid', 
    store: store
}));
app.use(passport.initialize());
app.use(passport.session());

fccTesting(app);

// --- CRITICAL: SOCKET.IO AUTHORIZATION FUNCTIONS ---
function onAuthorizeSuccess(data, accept) {
    console.log('successful connection to socket.io');
    accept(null, true);
}

function onAuthorizeFail(data, message, error, accept) {
    if (error) throw new Error(message);
    console.log('failed connection to socket.io:', message);
    accept(null, false);
}

// --- CRITICAL: SOCKET.IO AUTHORIZATION MIDDLEWARE ---
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

// ----------------------
// Connect to MongoDB
// ----------------------
myDB(async (client) => {
    const myDataBase = client.db('fcc').collection('users');

    // Auth + Routes
    require('./auth.js')(app, myDataBase);
    require('./routes.js')(app, myDataBase);

    // ----------------------
    // Socket.IO connections (Logic that requires authenticated user data)
    // ----------------------
    io.on('connection', socket => {
        console.log('A user has connected');
        
        // Emit user joined event using the current number of clients
        let currentUsers = io.engine.clientsCount;
        io.emit('user', {
            name: socket.request.user.name,
            currentUsers,
            connected: true
        });

        // Escuchar mensajes del cliente
        socket.on('chat message', message => {
            io.emit('chat message', { name: socket.request.user.name, message: message });
        });

        // Manejar desconexión
        socket.on('disconnect', () => {
            console.log('A user has disconnected');
            // Recalculate count after disconnect (it handles itself)
            let currentUsers = io.engine.clientsCount; 
            // Emit disconnection event
            io.emit('user', {
                name: socket.request.user.name,
                currentUsers,
                connected: false
            });
        });
    });

}).catch(err => {
    console.error(err);
    app.get('/', (req, res) => res.render('pug', { title: 'Error', message: 'Unable to connect to DB' }));
});

// ----------------------
// Start server (Must use the http server)
// ----------------------
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Listening on port ${PORT}`));