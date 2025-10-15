const passport = require('passport');
const ObjectID = require('mongodb').ObjectID;
const GitHubStrategy = require('passport-github').Strategy;

module.exports = function (app, db) {
  
    // 1. Serializar y Deserializar el usuario
    passport.serializeUser((user, done) => {
        done(null, user._id);
    });

    passport.deserializeUser((id, done) => {
        db.collection('users').findOne(
            {_id: new ObjectID(id)},
            (err, doc) => {
                done(null, doc);
            }
        );
    });
    
    // 2. Implementación de la Estrategia de GitHub
    passport.use(new GitHubStrategy({
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        // Usando la URL de callback proporcionada por el usuario
        callbackURL: 'https://boilerplate-advancednode-s02l.onrender.com/auth/github/callback'
      },
      function(accessToken, refreshToken, profile, cb) {
        
        // Lógica de la Base de Datos: Buscar o Crear Usuario
        db.collection('users').findOneAndUpdate(
            { id: profile.id }, // Buscar por ID de GitHub
            {
                // Establecer o actualizar los campos del usuario
                $setOnInsert: {
                    id: profile.id,
                    username: profile.username,
                    name: profile.displayName || 'John Doe',
                    photo: profile.photos[0].value || '',
                    email: Array.isArray(profile.emails) ? profile.emails[0].value : 'No public email',
                    created_on: new Date()
                },
                // Si el usuario ya existe, solo actualizamos la última sesión
                $set: {
                    last_login: new Date()
                },
                // Asegurarse de que el contador de login esté actualizado
                $inc: {
                    login_count: 1
                }
            },
            { upsert: true, returnOriginal: false }, // Insertar si no existe (upsert: true)
            (err, doc) => {
                // El campo 'value' de doc contiene el documento actualizado
                return cb(null, doc.value);
            }
        );
      }
    ));
};