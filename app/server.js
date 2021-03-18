require('dotenv').config()
/*
Copyright 2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.
Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at
http://aws.amazon.com/apache2.0/
or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
*/

// Define our dependencies
var express        = require('express');
var session        = require('express-session');
var passport       = require('passport');
var OAuth2Strategy = require('passport-oauth').OAuth2Strategy;
var request        = require('request');
var handlebars     = require('handlebars');
var fileUpload     = require('express-fileupload');
var fs             = require('fs');

// Define our constants, you will change these with your own
const TWITCH_CLIENT_ID = process.env.CLIENT_ID;
const TWITCH_SECRET    = process.env.CLIENT_SECRET;
const SESSION_SECRET   = process.env.SECRET;
const CALLBACK_URL     = `${process.env.CALLBACK_URI_BASE}/auth/twitch/callback`;  // You can run locally with - http://localhost:3000/auth/twitch/callback

// Initialize Express and middlewares
var app = express();
app.use(session({secret: SESSION_SECRET, resave: false, saveUninitialized: false}));
app.use(express.static('public'));
app.use(passport.initialize());
app.use(passport.session());
app.use(fileUpload());


// Override passport profile function to get user profile from Twitch API
OAuth2Strategy.prototype.userProfile = function(accessToken, done) {
    var options = {
        url: 'https://api.twitch.tv/helix/users',
        method: 'GET',
        headers: {
            'Client-ID': TWITCH_CLIENT_ID,
            'Accept': 'application/vnd.twitchtv.v5+json',
            'Authorization': 'Bearer ' + accessToken
        }
    };

    request(options, function (error, response, body) {
        if (response && response.statusCode == 200) {
            done(null, JSON.parse(body));
        } else {
            done(JSON.parse(body));
        }
    });
}

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(user, done) {
    done(null, user);
});

passport.use('twitch', new OAuth2Strategy({
    authorizationURL: 'https://id.twitch.tv/oauth2/authorize',
    tokenURL: 'https://id.twitch.tv/oauth2/token',
    clientID: TWITCH_CLIENT_ID,
    clientSecret: TWITCH_SECRET,
    callbackURL: CALLBACK_URL,
    state: true
},
function(accessToken, refreshToken, profile, done) {
    profile.accessToken = accessToken;
    profile.refreshToken = refreshToken;

// Securely store user profile in your DB
//User.findOrCreate(..., function(err, user) {
//  done(err, user);
//});

done(null, profile);
}
));

// Set route to start OAuth link, this is where you define scopes to request
app.get('/auth/twitch', passport.authenticate('twitch', { scope: 'user_read' }));

// Set route for OAuth redirect
app.get('/auth/twitch/callback', passport.authenticate('twitch', { successRedirect: '/upload', failureRedirect: '/upload' }));

// Define a simple template to safely generate HTML with values from user's profile
var uploadTemplate = handlebars.compile(`
    <html>
        <head>
            <title>Twitch Auth Sample</title>
        </head>
        <body>
            <form ref='uploadForm' 
                id='uploadForm' 
                action='/upload' 
                method='post' 
                encType="multipart/form-data"
            >
                <input type="file" name="sampleFile" />
                <input type='submit' value='Upload!' />
            </form>     
            <table>
                <tr>
                    <th>Access Token</th><td>{{accessToken}}</td>
                </tr>
                <tr>
                    <th>Refresh Token</th><td>{{refreshToken}}</td>
                </tr>
                {{#each data}}
                    <tr>
                        <th>Display Name</th><td>{{this.display_name}}</td>
                    </tr>
                    <tr>
                        <th>Bio</th><td>{{this.description}}</td>
                    </tr>
                    <tr>
                        <th>Image</th><td><img src="{{this.profile_image_url}}" /></td>
                    </tr>
                {{/each}}
            </table>
        </body>
    </html>`);

const acceptedUsers = process.env.ACCEPTED_USERS.split(" ");
// If user has an authenticated session, display it, otherwise display link to authenticate
app.get('/upload', function (req, res) {
    if(req.session && req.session.passport && req.session.passport.user) {
        let isAccepted = false;
        req.session.passport.user.data.forEach(userData => {
            if(!isAccepted) {
                isAccepted = acceptedUsers.includes(userData.login);
            }
        });
        if(isAccepted) {
            res.send(uploadTemplate(req.session.passport.user));
            return;
        }
    }
    res.send(`
        <html>
            <head>
                <title>Twitch Auth Sample</title>
            </head>
            <body>
                <h1>
                    Tihi
                </h1>
            </body>
        </html>`);
});

app.post('/upload', function(req, res) {
  let sampleFile;
  let uploadPath;

  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('No files were uploaded.');
  }

  // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
  sampleFile = req.files.sampleFile;
  uploadPath = `${__dirname}/uploads/${new Date().getTime()}_${sampleFile.name}`;

  // Use the mv() method to place the file somewhere on your server
  sampleFile.mv(uploadPath, function(err) {
    if (err)
      return res.status(500).send(err);

    res.redirect("/meme");
  });
});

var memeTemplate = handlebars.compile(`
    <html>
        <head>
            <title>Meme for the pajk</title>
            <style>
                body {
                    max-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                img {
                    max-height: 100%;
                }
            </style>
        </head>
        <body>
            <script type="text/javascript">
                setTimeout(() => {
                    location.reload();
                }, {{timer}})
            </script>
            {{#if src}}
                <img src="data:image/png;base64, {{src}}" />
            {{/if}}
        </body>
    </html>
`);

let latestFileDir = null;
fs.watch(`${__dirname}/uploads/`, (eventType, filename) => {
    console.log(eventType);
    console.log(filename);
    latestFileDir = `${__dirname}/uploads/${filename}`;
});

app.get('/meme', function (req, res) {
    let base64Img;
    let timer = 2000;
    if (latestFileDir) {
        let bitmap = fs.readFileSync(latestFileDir);
        base64Img = Buffer.from(bitmap).toString('base64');
        timer = 20000;
        bitmap = null;
        setTimeout(() => {
            fs.unlinkSync(latestFileDir);
            latestFileDir = null;
        }, timer)
    }

    res.send(memeTemplate({src: base64Img, timer}));
});

app.listen(3000, function () {
    console.log('Twitch auth sample listening on port 3000!')
});