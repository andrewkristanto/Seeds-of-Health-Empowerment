var express = require('express');
var path = require('path');
const bodyParser = require('body-parser');
var urlencodedParser = bodyParser.urlencoded({ extended: false });
const validator  = require('express-validator');
var mysql = require('mysql');
var appDir = path.dirname(require.main.filename);
require('dotenv').config({path: appDir + '/.env'});

var app = express();

app.use('/assets/css', express.static('css'));
app.use(express.static('html'));
app.use('/assets/js', express.static('js'));

var con;
var cur_user = null
var cur_role = null
// app.use(validator());

// var api = express.Router();

// connect to database
while (con == null){
  console.log('Attempting sql connection');
  console.log(process.env.DB_HOST);
  con = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
  });
  con.connect(function(err) {
    if (err) {
      return null
    }
    console.log("MySQL Connected!");
  });
}

//starts app
app.listen(8000, () => {
  console.log('SApp listening on port 8000!')
});

//loads home page on start up
app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname,'./html/login.html'));
});

/* Page navigations */
app.get("/logout", urlencodedParser,  function(req, res) {
    res.sendFile(path.join(__dirname,'./html/login.html'));
});

app.get("/home", urlencodedParser,  function(req, res) {
  res.sendFile(path.join(__dirname,'./html/home.html'));
});

app.get("/profile", urlencodedParser,  function(req, res) {
  res.sendFile(path.join(__dirname,'./html/profile.html'));
});

app.get("/notifications", urlencodedParser,  function(req, res) {
  res.sendFile(path.join(__dirname,'./html/notifications.html'));
});

app.get("/survey", urlencodedParser,  function(req, res) {
  res.sendFile(path.join(__dirname,'./html/survey.html'));
});

app.get("/settings", urlencodedParser,  function(req, res) {
  res.sendFile(path.join(__dirname,'./html/settings.html'));
});

app.get("/createsurvey", urlencodedParser,  function(req, res) {
  res.sendFile(path.join(__dirname,'./html/create-survey.html'));
});

app.get("/surveydata", urlencodedParser,  function(req, res) {
  res.sendFile(path.join(__dirname,'./html/survey-data.html'));
});

app.get("/angelapplication", urlencodedParser,  function(req, res) {
  res.sendFile(path.join(__dirname,'./html/angel_application.html'));
});

//authenticates login
app.post('/',urlencodedParser,  function(req, res) {
  var username = req.body.email;
  var password = req.body.password;
  console.log("post received: Username: %s Password: %s", username, password);

  //checks login against database
  //
  var request = "SELECT Email, Password FROM User WHERE Email = '" + username + "'";
  con.query(request, function (err, result) {
    if (err){
      res.redirect(req.get('referer'));
    }
    if (!result.length){
      console.log("invalid username")
      res.redirect(req.get('referer'));
    }
    var pw_hash = result[0]["Password"];
    var username = result[0]["Username"];
    bcrypt.compare(password, pw_hash, function(err, res) {
      if (res){
        console.log("authenticated");
        cur_user = username;
        console.log(cur_user)
        res.sendFile(path.join(__dirname,'./html/home.html'));
      } else {
        console.log("invalid password")
        res.redirect(req.get('referer'));
      }
    });
  });
});

//register
app.post('/register',urlencodedParser,  function(req, res) {
  var fname = req.body.fname;
  var lname = req.body.lname;
  var email = req.body.email;
  var street = req.body.street;
  var city = req.body.city;
  var state = req.body.state;
  var zip = req.body.zip;
  var phone = req.body.phone;
  var password = req.body.pass;
  var confirmpass = req.body.confirmpass;

  con.query("INSERT INTO User (password, firstname, lastname, street, city, state, zip, email, role, phoneNumber) "+
    "VALUES ('" + password + "', '" + fname + "', '" + lname + "', '" + street + "', '" + city + "', '" + state + "', '" + zip + "' , '" + email + "', '"+"Gardener"+"', '" + phone + "');", function(err,res) {
      if (err) {
        res.redirect(req.get('referer'));
      } else if (res == 0) {
        console.log("registration success");
        res.sendFile(path.join(__dirname,'./html/login.html'));
      } else if (res == 1) {
        console.log("Registration attempt failed")
        res.redirect(req.get('referer'));
      }
      res.json(rows)
  });
});

//pull
app.get('/pull_profile',urlencodedParser,  function(req, res) {
  con.query("SELECT * FROM User WHERE Email = '" + cur_user + "'", function(err,rows) {
      if (err) throw err;
      console.log('Data received from Db:\n');
      console.log(rows);
      res.json(rows)
  });
});

app.get('/pull_notifications', urlencodedParser, function(req, res){
  con.query("SELECT * FROM Notifications WHERE Email = '" + cur_user + "'", function(err,rows) {
      if (err) throw err;
      console.log('Data received from Db:\n');
      console.log(rows);
      res.json(rows)
  });
});

app.get('/pull_survey', urlencodedParser, function(req, res){
  con.query("SELECT SurveyAnswers.Question, Answer, Type from SurveyAnswers INNER JOIN SurveyData ON SurveyAnswers.Question = SurveyData.Question WHERE SurveyData.Email ='" + cur_user + "'", function(err,rows) {
      if (err) throw err;
      console.log('Data received from Db:\n');
      console.log(rows);
      res.json(rows)
  });
});
