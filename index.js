const express = require('express');
const mongoose = require('mongoose');
const bodyparser = require('body-parser');
const cookieParser = require('cookie-parser');
const db = require('./config/config').get(process.env.NODE_ENV);
const User = require('./models/user');
const { auth } = require('./middlewares/auth');

const app = express();
var fetchUrl = require("fetch").fetchUrl;

// const {fetch} = require("node-fetch");

// app use
app.use(bodyparser.urlencoded({ extended: false }));
app.use(bodyparser.json());
app.use(cookieParser());

// database connection
mongoose.Promise = global.Promise;
mongoose.connect(db.DATABASE, { useNewUrlParser: true, useUnifiedTopology: true }, function (err) {
    if (err) console.log(err);
    console.log("database is connected");
});


app.get('/', function (req, res) {
    res.status(200).send(`Welcome to login , sign-up api`);
});

app.post('/api/users/signup', function (req, res) {
    const newuser = new User(req.body);

    if (newuser.password != newuser.password2) return res.status(400).json({ message: "password not match" });

    User.findOne({ email: newuser.email }, function (err, user) {
        if (user) return res.status(400).json(
            { auth: false, status: false, message: "email already exits" }
        );

        newuser.save((err, doc) => {
            if (err) {
                // console.log(err);
                return res.status(400).json(
                    {
                        success: false,
                        status: false,
                        message: "password lenght must be minimum 8 character"
                    }
                );
            }
            res.status(200).json({
                succes: true,
                status: true,
                user: doc
            });
        });
    });
});

app.post('/api/users/login', function (req, res) {
    let token = req.cookies.auth;
    User.findByToken(token, (err, user) => {
        if (err) return res(err);
        if (user) return res.status(400).json({
            error: true,
            message: "You are already logged in"
        });

        else {
            User.findOne({ 'email': req.body.email }, function (err, user) {
                if (!user) return res.json({ isAuth: false, status: false, message: ' Auth failed ,email not found' });

                user.comparepassword(req.body.password, (err, isMatch) => {
                    if (!isMatch) return res.json({ isAuth: false, status: false, message: "password doesn't match" });

                    user.generateToken((err, user) => {
                        if (err) return res.status(400).send(err);
                        res.cookie('auth', user.token).json({
                            isAuth: true,
                            id: user._id
                            , email: user.email
                        });
                    });
                });
            });
        }
    });
});

app.get('/api/users/me', auth, function (req, res) {
    res.json({
        isAuth: true,
        id: req.user._id,
        email: req.user.email,
        firstname: req.user.firstname,
        lastname: req.user.lastname
    })
});

app.get('/api/users/logout', auth, function (req, res) {
    req.user.deleteToken(req.token, (err, user) => {
        if (err) return res.status(400).send(err);
        res.json({
            message: "successfully logout",
        })
    });

});

app.get('/api/random-joke', auth, function (req, res) {
    fetchUrl("https://api.chucknorris.io/jokes/random", function (error, meta, body) {
        // console.log(body.toString());
        if (error) return res.status(400).send(error);
        res.json({
            data: JSON.parse(body.toString()),
            status: true
        })
    });
});

// listening port
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`app is live at ${PORT}`);
});