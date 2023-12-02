//jshint esversion:6
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
// const encrypt = require('mongoose-encryption');
// const md5 = require('md5');
const bcrypt = require('bcrypt');
const saltRounds = 10;



const app = express();
// console.log(process.env.API_KEY);
const secret = process.env.SECRET;

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

mongoose.connect('mongodb://localhost:27017/userDB');

const userSchema = new mongoose.Schema({
    email: String,
    password: String
});



// userSchema.plugin(encrypt, { secret: secret, encryptedFields: ['password'] });

const User = mongoose.model('User', userSchema);

app.post('/register', async function (req, res) {
    bcrypt.hash(req.body.password, saltRounds, async function (err, hash) {
        const newUser = new User({
            email: req.body.username,
            password: hash
        });
        try {
            const user = await newUser.save();
            res.render('secrets');
        } catch (error) {
            console.log(error);
        }

        // const newUser = new User({
        //     email: req.body.username,
        //     password: md5(req.body.password)
        // });

        // try {
        //     const user = await newUser.save();
        //     res.render('secrets');
        // } catch (error) {
        //     console.log(error);
        // }

    });
});

app.post('/login', async function (req, res) {
    const username = req.body.username;
    // const password = md5(req.body.password);
    const password = req.body.password;
    try {
        const foundUser = await User.findOne({ email: username });
        if (foundUser) {
            // if (foundUser.password === password) {
            bcrypt.compare(password, foundUser.password, function (err, result) {
                if (result === true) {
                    res.render('secrets');
                }
            });


        }
    } catch (error) {
        console.log(error);
    }
});



app.get('/', function (req, res) {
    res.render('home');
});


app.get('/login', function (req, res) {
    res.render('login');
});

app.get('/register', function (req, res) {
    res.render('register');
});



app.listen(3000, function () {
    console.log('Server started on port 3000');
});