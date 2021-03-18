var express        = require("express");
var bodyParser     = require("body-parser");
var cookieParser   = require("cookie-parser");
var cookieSession  = require("cookie-session");
var passport       = require("passport");
var twitchStrategy = require("passport-twitch").Strategy;

var app = express();

app.set("views", "./views");
app.set("view engine", "ejs");

// Middlewares
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cookieSession({secret:"${process.env.SECRET}"}));
app.use(passport.initialize());
app.use(express.static("./public"));

passport.use(new twitchStrategy({
    clientID: "${process.env.CLIENT_ID}",
    clientSecret: "${process.env.CLIENT_SECRET}",
    callbackURL: "http://127.0.0.1:3000/auth/twitch/callback",
    scope: "user_read"
  },
  function(accessToken, refreshToken, profile, done) {
    // Suppose we are using mongo..
    User.findOrCreate({ twitchId: profile.id }, function (err, user) {
      return done(err, user);
    });
  }
));

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(user, done) {
    done(null, user);
});

app.get("/", function (req, res) {
    res.render("index");
});

app.get("/auth/twitch", passport.authenticate("twitch"));
app.get("/auth/twitch/callback", passport.authenticate("twitch", { failureRedirect: "/" }), function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/");
});

app.listen(8080);
