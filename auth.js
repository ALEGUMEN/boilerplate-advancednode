const { ObjectId } = require('mongodb');
const GitHubStrategy = require('passport-github').Strategy;

module.exports = function (passport, usersCollection) {
  // Serialización del usuario
  passport.serializeUser((user, done) => {
    done(null, user._id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await usersCollection.findOne({ _id: new ObjectId(id) });
      done(null, user);
    } catch (err) {
      console.error('Error deserializing user:', err);
      done(err, null);
    }
  });

  // ✅ Estrategia de GitHub
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: process.env.GITHUB_CALLBACK_URL || 'https://boilerplate-advancednode.yourusername.repl.co/auth/github/callback'
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const user = await usersCollection.findOneAndUpdate(
            { id: profile.id },
            {
              $setOnInsert: {
                id: profile.id,
                username: profile.username,
                name: profile.displayName || 'Anonymous',
                photo: profile.photos?.[0]?.value || '',
                email: profile.emails?.[0]?.value || '',
                provider: profile.provider || 'github',
                created_on: new Date()
              }
            },
            { upsert: true, returnDocument: 'after' }
          );
          return done(null, user.value);
        } catch (err) {
          console.error('Error with GitHub Strategy:', err);
          return done(err, null);
        }
      }
    )
  );
};
