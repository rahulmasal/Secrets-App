//jshint esversion:6
require('dotenv').config();

const session = require('express-session');
const express = require('express');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
// const encrypt = require('mongoose-encryption');
// const md5 = require('md5');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();
// console.log(process.env.API_KEY);
const secret = process.env.SECRET;

app.use(express.static(__dirname + '/public'));
app.set("views", __dirname + "/views");
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: 'Our little secret.',
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());



mongoose.connect(process.env.MONGO_CONNECTION_STRING).then(() => console.log("Database Connection succeed"));

// mongoose.set('useCreateIndex', true);

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
// userSchema.plugin(encrypt, { secret: secret, encryptedFields: ['password'] });

const User = mongoose.model('User', userSchema);
passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function (user, done) {
    done(null, user.id);
});

// passport.deserializeUser(function (id, done) {
//     User.findById(id, function (err, user) {
//         done(err, user);
//     });
// });
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err);
    }
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
    function (accessToken, refreshToken, profile, cb) {
        User.findOrCreate({ googleId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));


app.get('/secrets', async function (req, res) {
    try {
        const foundUsers = await User.find({ 'secret': { $ne: null } });
        if (foundUsers) {
            res.render('secrets', { usersWithSecrets: foundUsers });
        }
    } catch (err) {
        console.log(err);
        res.status(500).send('An error occurred while retrieving secrets.');
    }
});

// app.get('/secrets', async function (req, res) {
// if (req.isAuthenticated()) {
//     res.render('secrets');
// }
// else {
//     res.redirect('/login');
// }

//     User.find({ 'secret': { $ne: null } }, function (err, foundUsers) {
//         if (err) {
//             console.log(err);
//         } else {
//             if (foundUsers) {
//                 res.render('secrets', { usersWithSecrets: foundUsers });
//             }
//         }
//     });

// });
app.get('/submit', async function (req, res) {
    if (req.isAuthenticated()) {
        res.render('submit');
    }
    else {
        res.redirect('/login');
    }
});
app.post('/submit', async function (req, res) {
    const submittedSecret = req.body.secret;

    try {
        const foundUser = await User.findById(req.user.id);
        if (foundUser) {

            foundUser.secret = submittedSecret;
            // foundUser.secret.push(submittedSecret);
            await foundUser.save();
            res.redirect('/secrets');
        } else {
            // Handle the case where the user is not found
            res.status(404).send('User not found');
        }
    } catch (err) {
        console.log(err);
        res.status(500).send('An error occurred');
    }
});
// app.post('/submit', async function (req, res) {
//     const submittedSecret = req.body.secret;
//     User.findById(req.user.id, function (err, foundUser) {
//         if (err) {
//             console.log(err);
//         } else {
//             if (foundUser) {
//                 foundUser.secret = submittedSecret;
//                 foundUser.save(function () {
//                     res.redirect('/secrets');
//                 });
//             }
//         }
//     });
// });

app.post('/register', async function (req, res) {
    User.register({ username: req.body.username }, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            res.redirect('/register');
        } else {
            passport.authenticate('local')(req, res, function () {
                res.redirect('/secrets');
            });
        }
    });
});

app.post('/login', async function (req, res) {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    req.login(user, function (err) {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate('local')(req, res, function () {
                res.redirect('/secrets');
            });
        }
    });
});

app.get('/logout', function (req, res) {
    req.logout(function (err) {
        if (err) {
            console.log(err);
        }
        res.redirect('/');
    });

});
// app.post('/register', async function (req, res) {
//     bcrypt.hash(req.body.password, saltRounds, async function (err, hash) {
//         const newUser = new User({
//             email: req.body.username,
//             password: hash
//         });
//         try {
//             const user = await newUser.save();
//             res.render('secrets');
//         } catch (error) {
//             console.log(error);
//         }

//         // const newUser = new User({
//         //     email: req.body.username,
//         //     password: md5(req.body.password)
//         // });

//         // try {
//         //     const user = await newUser.save();
//         //     res.render('secrets');
//         // } catch (error) {
//         //     console.log(error);
//         // }

//     });
// });

// app.post('/login', async function (req, res) {
//     const username = req.body.username;
//     // const password = md5(req.body.password);
//     const password = req.body.password;
//     try {
//         const foundUser = await User.findOne({ email: username });
//         if (foundUser) {
//             // if (foundUser.password === password) {
//             bcrypt.compare(password, foundUser.password, function (err, result) {
//                 if (result === true) {
//                     res.render('secrets');
//                 }
//             });


//         }
//     } catch (error) {
//         console.log(error);
//     }
// });



app.get('/', function (req, res) {
    res.render('home');
});

app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile'] }));


app.get('/auth/google/secrets',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function (req, res) {
        res.redirect('/secrets');
    });
app.get('/login', function (req, res) {
    res.render('login');
});

app.get('/register', function (req, res) {
    res.render('register');
});


app.listen(process.env.PORT || 3000, function () {
    console.log('Server started on port 3000');
});

// app.listen(3000, function () {
//     console.log('Server started on port 3000');
// });