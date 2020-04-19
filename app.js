var express = require('express');
var path = require('path');
const bodyParser = require('body-parser');
var urlencodedParser = bodyParser.urlencoded({ extended: false });
const validator  = require('express-validator');
var mysql = require('mysql');
var appDir = path.dirname(require.main.filename);
const bcrypt = require('bcryptjs');
require('dotenv').config({path: appDir + '/.env'});

var app = express();

app.use('/html/assets/css', express.static('css'));
app.use(express.static(path.join(__dirname, 'html/assets/css')));
app.use(express.static('html'));
app.use('/html/assets/js', express.static('js'));
// app.use(validator());

var con;
var cur_user = null;
/* Roles:
 * 0 - User
 * 1 - Gardener
 * 2 - Angel
 */
var cur_role = null;
var cur_post = null;
var alerts = [];
var check_filter = null;
var check_filter_role = null;

var api = express.Router();

// connect to database
while (con == null){
  console.log('Attempting sql connection');
  con = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
  });
  console.log("MySQL Connected!");
  // con.connect(function(err) {
  //   if (err) {
  //     return null
  //   }
  //   console.log("MySQL Connected!");
  // });
}

//starts app
app.listen(8000, () => {
  console.log('SApp listening on port 8000!');
});

//loads home page on start up
app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname,'./html/login.html'));
});

// Page navigations ===================================================================================================================
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

app.get("/checkin", urlencodedParser,  function(req, res) {
  res.sendFile(path.join(__dirname,'./html/check-in.html'));
});

app.get("/checkintable", urlencodedParser,  function(req, res) {
  res.sendFile(path.join(__dirname,'./html/check-in-table.html'));
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

app.post("/posts", urlencodedParser, function(req, res) {
  cur_post = req.body.postId;
  console.log(cur_post);
  console.log(req.body);
  res.sendFile(path.join(__dirname,'./html/posts.html'));
});

app.post('/view_check_ins', urlencodedParser, function(req, res){
  var params = req.body.checkFilter.split(",");
  check_filter = params[0];
  check_filter_role = params[1];
  console.log(params);
  res.sendFile(path.join(__dirname,'./html/check-in-table.html'));
});

app.post('/forgot_password', urlencodedParser, function(req, res) {
  var email = req.body.email;

  //checks email against database
  var request = "SELECT email FROM User WHERE email = '" + email + "'";
  con.query(request, function (err, result) {
    if (err){
      res.redirect(req.get('referer'));
    }
    if (result.length == 0){
      console.log("Invalid username");
      alerts.push({alert: "Invalid email address.", type: "danger"});
      res.redirect(req.get('referer'));
    } else {
      var email2 = result[0]["email"];
      var generator = require('generate-password'); 
      var tempPass = generator.generate({
          length: 12,
          numbers: true
      }); 

      console.log(tempPass);

      bcrypt.hash(tempPass, 10, function(err, hash) {
        var query = "UPDATE User SET password='" + hash + "' WHERE email='" + email2 + "';";
        console.log(query);
        con.query(query, function(err) {
          if (err) {
            console.log("Update password attempt failed");
            alerts.push({alert: "Failed to reset password, please try again.", type: "danger"});
            res.redirect(req.get('referer'));
          } else {
            //send an email containing temporary password to user
            var nodemailer = require('nodemailer');

            var transporter = nodemailer.createTransport({
              service: 'gmail',
              auth: {
                user: 'historicwestsidegardenstest@gmail.com',
                pass: 'testing12345!'
              }
            });

            var message = 'We have temporarily changed your password to ' + tempPass + '. Please login with it and update your password.';

            var mailOptions = {
              from: 'historicwestsidegardenstest@gmail.com',
              to: email,
              subject: 'Reset Password',
              text: message
            };

            transporter.sendMail(mailOptions, function(error, info){
              if (error) {
                console.log(error);
              } else {
                console.log('Email sent: ' + info.response);
              }
            });
            console.log("Reset password success");
            alerts.push({alert: "Reset password successfully! Check your email.", type: "success"});
            res.sendFile(path.join(__dirname,'./html/login.html'));
          }
        });
      });
    }
  });
});

// LOGIN =========================================================================================================================
app.post('/',urlencodedParser,  function(req, res) {
  var email = req.body.email;
  var password = req.body.password;
  console.log("post received: Username: %s Password: %s", email, password);

  //checks login against database
  var request = "SELECT email, password, role FROM User WHERE email = '" + email + "'";
  con.query(request, function (err, result) {
    if (err){
      res.sendFile(path.join(__dirname,'./html/login.html'));
    }
    if (result.length == 0){
      console.log("Invalid username");
      alerts.push({alert: "Invalid username.", type: "danger"});
      res.sendFile(path.join(__dirname,'./html/login.html'));
    } else {
      var pw_hash = result[0]["password"];
      var email = result[0]["email"];
      var role = result[0]["role"];
      bcrypt.compare(password, pw_hash, function(err, res2) {
        if (res2){
          console.log("Authenticated");
          cur_user = email;
          cur_role = role;
          console.log(cur_user)
          res.sendFile(path.join(__dirname,'./html/home.html'));
        } else {
          console.log("Invalid password");
          alerts.push({alert: "Invalid password.", type: "danger"});
          res.sendFile(path.join(__dirname,'./html/login.html'));
        }
      });
    }
  });
});

// REGISTER ===========================================================================================================================================================
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
  var role = req.body.role;
  console.log(req.body);

  var valid = true;
  if (password.length < 8 || password.length > 20) {
    valid = false;
    alerts.push({alert: "Password must have a length between 8 and 20 characters.", type: "danger"});
  }
  if (password != confirmpass) {
    valid = false;
    alerts.push({alert: "Passwords do not match.", type: "danger"});
  }

  var query4 = "SELECT email FROM User;";
  con.query(query4, function(err, rows) {
    if (err) {
      console.log("Failed to pull emails from database.")
      console.log(err);
      res.redirect(req.get('referer'));
    } else {
      console.log('Data received from Db:\n');
      console.log(rows);

      var check = false;

      rows.forEach((d) => {
        if (d.email.toLowerCase() == email.toLowerCase()) {
          check = true;
        }
      });

      if (check) {
        alerts.push({alert: "Email already exists in the database.", type: "danger"});
      }
    }
  });

  if (valid) {
    bcrypt.hash(password, 10, function(err, hash) {
      var query = "INSERT INTO User (password, firstName, lastName, street, city, state, zipcode, email, phoneNumber, userStatus, lastLogin, role) "+
      "VALUES ('" + hash + "', '" + fname + "', '" + lname + "', '" + street + "', '" + city + "', '" + state + "', '" + zip + "', '" + email + "', '" + phone + "', 'pending', null, " + role + ");";

      var query2 = "INSERT INTO NotificationSettings (email, toggle) VALUES ('" + email + "', 'On');";

      console.log(query);
      console.log(query2);
      con.query(query, function(err) {
        if (err) {
          console.log("Registration attempt failed");
          if (alerts.length == 0) {
            alerts.push({alert: "Registration attempt failed, please try again.", type: "danger"});
          }
          console.log(err);
          res.redirect(req.get('referer'));
        } else {
          con.query(query2, function(err) {
            if (err) {
              console.log("Failed to add notification settings");
              console.log(err);
              res.redirect(req.get('referer'));
            } else {
              console.log("Notification settings added");
            }
          });
          console.log("Registration success");
          alerts.push({alert: "Registered successfully!", type: "success"});
          res.sendFile(path.join(__dirname,'./html/login.html'));

          //send a notification to newly registered account
          var content = "Welcome to Seeds of Health Empowerment!";
          var query3 = "INSERT INTO Notifications (email, content) VALUES ('" + email + "', '" + content + "');";
          con.query(query3, function(err){
            if (err) {
              console.log(err);
            } else {
              //send an email to newly registered user
              var nodemailer = require('nodemailer');

              var transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                  user: 'historicwestsidegardenstest@gmail.com',
                  pass: 'testing12345!'
                }
              });

              var mailOptions = {
                from: 'historicwestsidegardenstest@gmail.com',
                to: email,
                subject: 'Welcome to Seeds of Health Empowerment',
                text: 'Thanks for registering an account with us!'
              };

              transporter.sendMail(mailOptions, function(error, info){
                if (error) {
                  console.log(error);
                } else {
                  console.log('Email sent: ' + info.response);
                }
              });
            }
          }); 
        }
      });
    });
  } else {
    console.log("Invalid input");
    console.log(alerts)
    res.redirect(req.get('referer'));
  }
});

// PULL ==================================================================================================================================
app.get('/pull_profile',urlencodedParser,  function(req, res) {
  console.log("Arrived on profile page.");
  con.query("SELECT * FROM User WHERE Email = '" + cur_user + "';", function(err,rows) {
      if (err) throw err;
      console.log('Data received from Db:\n');
      console.log(rows);
      res.json(rows);
  });
});

app.get('/pull_role',urlencodedParser,  function(req, res) {
  console.log("Pulling nav bar.");
  con.query("SELECT role, userStatus FROM User WHERE email = '" + cur_user + "';", function(err,rows) {
      if (err) throw err;
      console.log('Data received from Db:\n');
      console.log(rows);
      res.json(rows);
  });
});

app.get('/pull_profile_checkin',urlencodedParser,  function(req, res) {
  console.log("Arrived on profile page.");
  con.query("SELECT * FROM User WHERE Email = '" + check_filter + "';", function(err,rows) {
      if (err) throw err;
      console.log('Data received from Db:\n');
      console.log(rows);
      res.json(rows);
  });
});

app.get('/pull_notifications', urlencodedParser, function(req, res){
  console.log("Arrived on notifications page.");
  con.query("SELECT * FROM Notifications WHERE Email = '" + cur_user + "' ORDER BY notifDate;", function(err,rows) {
      if (err) throw err;
      console.log('Data received from Db:\n');
      console.log(rows);
      res.json(rows);
  });
});

app.get('/pull_survey', urlencodedParser, function(req, res){
  console.log("Arrived on survey page.");
  con.query("SELECT SurveyQuestions.qID, SurveyQuestions.question, SurveyAnswers.answerChoice, SurveyQuestions.questionType " +
            "FROM SurveyQuestions " +
            "LEFT JOIN SurveyAnswers on SurveyQuestions.qID = SurveyAnswers.qID " +
            "LEFT JOIN SurveyResponses on SurveyQuestions.qID = SurveyResponses.qID " +
            "WHERE SurveyResponses.email='" + cur_user + "' and response='';", function(err,rows) {
      if (err) throw err;
      console.log('Data received from Db:\n');
      console.log(rows);
      res.json(rows);
  });
});

app.get('/pull_users', urlencodedParser, function(req, res){
  console.log("Arrived on check in page.");
  con.query("SELECT * " +
            "FROM User " +
            "WHERE role = 0 " +
            "ORDER BY firstName, lastName;", function(err,rows) {
      if (err) throw err;
      console.log('Data received from Db:\n');
      console.log(rows);
      res.json(rows)
  });
});

app.get('/pull_gardeners', urlencodedParser, function(req, res){
  console.log("Arrived on check in page.");
  con.query("SELECT * " +
            "FROM User " +
            "WHERE role = 1 " +
            "ORDER BY firstName, lastName;", function(err,rows) {
      if (err) throw err;
      console.log('Data received from Db:\n');
      console.log(rows);
      res.json(rows)
  });
});

app.get('/pull_gardeners_angels', urlencodedParser, function(req, res){
  console.log("Arrived on check in page.");
  con.query("SELECT * " +
            "FROM User " +
            "WHERE role = 1 or role = 2 " +
            "ORDER BY role, firstName, lastName;", function(err,rows) {
      if (err) throw err;
      console.log('Data received from Db:\n');
      console.log(rows);
      res.json(rows)
  });
});

app.get('/pull_posts', urlencodedParser, function(req, res){
  console.log("Arrived on home page.");
  con.query("SELECT User.firstName, User.lastName, Posts.postId, Posts.postDate, Posts.postText, Posts.email " +
            "FROM Posts " +
            "LEFT JOIN User on Posts.email = User.email " + 
            "ORDER BY Posts.postDate ASC;" , function(err,rows) {
      if (err) throw err;
      console.log('Data received from Db:\n');
      console.log(rows);
      res.json(rows);
  });
});

app.get('/pull_comments', urlencodedParser, function(req, res){
  console.log("Arrived on posts page.");
  var query = "SELECT pUser.firstName as postFName, pUser.lastName as postLName, Posts.postId, Posts.postDate, Posts.postText, cUser.firstName as commentFName, cUser.lastName as commentLName, Comments.commentText, Comments.commentDate, Comments.commentId, Comments.email " +
              "FROM Posts " +
              "LEFT JOIN Comments on Posts.postId = Comments.postId " +
              "LEFT JOIN User pUser on Posts.email = pUser.email " +
              "LEFT JOIN User cUser on Comments.email = cUser.email " +
              "WHERE Posts.postId='" + cur_post + "' " + 
              "ORDER BY Comments.commentDate ASC;";
  console.log(query);

  con.query(query, function(err,rows) {
      if (err) throw err;
      console.log('Data received from Db:\n');
      console.log(rows);
      res.json(rows);
  });
});

app.get('/pull_pending_angels', urlencodedParser, function(req, res){
  console.log("Arrived on Garden Angel page.");
  con.query("SELECT concat(firstName, ' ', lastName) as Name, userStatus, email " +
            "FROM User " +
            "WHERE role = 2 and userStatus = \""+"pending"+ "\" " + 
            "ORDER BY firstName, lastName;", function(err,rows) {
      if (err) throw err;
      console.log('Data received from Db:\n');
      console.log(rows);
      res.json(rows);
  });
});

app.get('/pull_accepted_angels', urlencodedParser, function(req, res){
  console.log("Arrived on Garden Angel page.");
  con.query("SELECT concat(firstName, ' ', lastName) as Name, userStatus, email " +
            "FROM User " +
            "WHERE role = 2 and userStatus = \""+"accepted"+ "\" " + 
            "ORDER BY firstName, lastName;", function(err,rows) {
      if (err) throw err;
      console.log('Data received from Db:\n');
      console.log(rows);
      res.json(rows);
  });
});

app.get('/pull_settings',urlencodedParser,  function(req, res) {
  console.log("Arrived on settings page.");
  console.log("TESTING\n\n\n\n\n")
  con.query("SELECT * FROM NotificationSettings WHERE email = '" + cur_user + "';", function(err,rows) {
      if (err) throw err;
      console.log('Data received from Db:\n');
      console.log(rows);
      res.json(rows);
  });
});


app.get('/pull_survey_question', urlencodedParser, function(req, res){
  console.log("Pulling all survey questions");
  con.query("SELECT question, qID FROM SurveyQuestions", function(err,rows) {
      if (err) throw err;
      console.log('Data received from Db:\n');
      console.log(rows);
      res.json(rows);
  });
});

app.get('/pull_survey_question_type/:id', urlencodedParser, function(req, res){
  console.log("Pulling all survey questions");
  var qID = req.params.id;
  con.query("SELECT questionType, releaseDate FROM SurveyQuestions WHERE qID = "+qID+" ", function(err,rows) {
      if (err) throw err;
      console.log('Data received from Db:\n');
      console.log(rows);
      res.json(rows);
  });
});

app.get('/pull_survey_data_mc/:id', urlencodedParser, function(req, res){
  console.log("Pulling survey results");
  var qID = req.params.id;
  con.query("SELECT  answerChoice, IF(c is not NULL, c, 0) as count " +
            "FROM " +
            "(SELECT response, count(response) AS c " +
            "FROM SurveyResponses " +
            "WHERE qID = "+qID+" " +
            "GROUP BY response) AS A " +
            "RIGHT JOIN " +
            "(SELECT answerChoice " +
            "FROM SurveyAnswers " +
            "WHERE qID = "+qID+") AS B " +
            "ON A.response = B.answerChoice " +
            "GROUP BY B.answerChoice", function(err,rows) {
      if (err) throw err;
      console.log('Data received from Db:\n');
      console.log(rows);
      res.json(rows);
  });
});

app.get('/pull_survey_data_fr/:id', urlencodedParser, function(req, res){
  var qID = req.params.id;
  con.query("SELECT response " +
            "FROM SurveyResponses " +
            "WHERE qID = "+qID+" AND response != ''", function(err,rows) {
      if (err) throw err;
      console.log('Data received from Db:\n');
      console.log(rows);
      res.json(rows);
  });
});

app.get('/pull_alerts', urlencodedParser, function(req, res){
  console.log(alerts);
  res.json(alerts);
  alerts = [];
});

app.get('/pull_checkins', urlencodedParser, function(req, res){
  console.log("Gardener check-ins");
  if(cur_role == 1){
    con.query("SELECT * FROM CheckIn WHERE gardener = '" + cur_user + "' ORDER BY checkDate;", function(err, rows){
      if (err) throw err;
      console.log('Data received from Db:\n');
      console.log(rows);
      res.json(rows)
    });
  } else if(cur_role == 2){
    con.query("SELECT * FROM CheckIn WHERE angel = '" + cur_user + "' ORDER BY checkDate;", function(err, rows){
      if (err) throw err;
      console.log('Data received from Db:\n');
      console.log(rows);
      res.json(rows)
    });
  } 
});

app.get('/pull_check_ins', urlencodedParser, function(req, res){
  console.log("Arrived on view check in table page.");
  if(check_filter_role == 1){
    con.query("SELECT * FROM CheckIn WHERE gardener = '" + check_filter + "' ORDER BY checkDate;", function(err, rows){
      if (err) throw err;
      console.log('Data received from Db:\n');
      console.log(rows);
      res.json(rows)
    });
  } else if(check_filter_role == 2){
    con.query("SELECT * FROM CheckIn WHERE angel = '" + check_filter + "' ORDER BY checkDate;", function(err, rows){
      if (err) throw err;
      console.log('Data received from Db:\n');
      console.log(rows);
      res.json(rows)
    });
  } 
});

app.get('/pull_survey_question', urlencodedParser, function(req, res){
  console.log("Pulling all survey questions");
  con.query("SELECT question, qID FROM SurveyQuestions", function(err,rows) {
      if (err) throw err;
      console.log('Data received from Db:\n');
      console.log(rows);
      res.json(rows)
  });
});

app.get('/pull_survey_question_type/:id', urlencodedParser, function(req, res){
  console.log("Pulling all survey questions");
  var qID = req.params.id;
  con.query("SELECT questionType FROM SurveyQuestions WHERE qID = "+qID+" ", function(err,rows) {
      if (err) throw err;
      console.log('Data received from Db:\n');
      console.log(rows);
      res.json(rows)
  });
});

app.get('/pull_survey_data_mc/:id', urlencodedParser, function(req, res){
  console.log("Pulling survey results");
  var qID = req.params.id;
  con.query("SELECT  answerChoice, IF(c is not NULL, c, 0) as count " +
            "FROM " +
            "(SELECT response, count(response) AS c " +
            "FROM SurveyResponses " +
            "WHERE qID = "+qID+" " +
            "GROUP BY response) AS A " +
            "RIGHT JOIN " +
            "(SELECT answerChoice " +
            "FROM SurveyAnswers " +
            "WHERE qID = "+qID+") AS B " +
            "ON A.response = B.answerChoice " +
            "GROUP BY B.answerChoice", function(err,rows) {
      if (err) throw err;
      console.log('Data received from Db:\n');
      console.log(rows);
      res.json(rows)
  });
});

app.get('/pull_survey_data_fr/:id', urlencodedParser, function(req, res){
  var qID = req.params.id;
  con.query("SELECT response " +
            "FROM SurveyResponses " +
            "WHERE qID = "+qID+" AND response != ''", function(err,rows) {
      if (err) throw err;
      console.log('Data received from Db:\n');
      console.log(rows);
      res.json(rows)
  });
});

// UPDATE ======================================================================================================================
app.post('/update_profile',urlencodedParser,  function(req, res) {
  var fname = req.body.fname;
  var lname = req.body.lname;
  var street = req.body.street;
  var city = req.body.city;
  var state = req.body.state;
  var zip = req.body.zip;
  var phone = req.body.phone;
  
  var query = "UPDATE User SET firstName='" + fname + "', lastName='" + lname + "', street='" + street + "', city='" + city +
  "', state='" + state + "', zipcode='" + zip + "', phoneNumber='" + phone + "' WHERE email='" + cur_user + "';";
  console.log(query);

  con.query(query, function(err) {
    if (err) {
      console.log("Update profile attempt failed");
      alerts.push({alert: "Updating profile failed, please try again.", type: "danger"});
      res.redirect(req.get('referer'));
    } else {
      console.log("Update profile success");
      alerts.push({alert: "Updated profile successfully!", type: "success"});
      res.sendFile(path.join(__dirname,'./html/profile.html'));
    }
  });
});

app.post('/update_password',urlencodedParser,  function(req, res) {
  var currPass = req.body.currPass;
  var newPass = req.body.newPass;
  var newPass2 = req.body.newPass2;
  console.log(req.body);

  var valid = true;
  if (newPass.length < 8 || newPass.length > 20) {
    alerts.push({alert: "Password must have a length between 8 and 20 characters.", type: "danger"});
    valid = false;
  }
  if (newPass != newPass2) {
    alerts.push({alert: "Passwords do not match.", type: "danger"});
    valid = false;
  }

  if (valid) {
    con.query("SELECT password FROM User WHERE Email = '" + cur_user + "'", function (err, result) {
      if (err){
        res.redirect(req.get('referer'));
      }
      var pw_hash = result[0]["password"];
      bcrypt.compare(currPass, pw_hash, function(err, res2) {
        if (res2){
          console.log("Password authenticated");
          bcrypt.hash(newPass, 10, function(err, hash) {
            var query = "UPDATE User SET password='" + hash + "' WHERE email='" + cur_user + "';";
            console.log(query);
            con.query(query, function(err) {
              if (err) {
                console.log("Update password attempt failed");
                alerts.push({alert: "Updating password failed, please try again.", type: "danger"});
                res.redirect(req.get('referer'));
              } else {
                console.log("Update password success");
                alerts.push({alert: "Updated password successfully!", type: "success"});
                res.sendFile(path.join(__dirname,'./html/profile.html'));
              }
            });
          });
        } else {
          console.log("Invalid password");
          alerts.push({alert: "Invalid password, please try again.", type: "danger"});
          res.redirect(req.get('referer'));
        }
      });
    });
  } else {
    console.log("Invalid input");
    res.redirect(req.get('referer'));
  }
});

app.post('/updateSettings', urlencodedParser, function(req, res) {
  var toggle = req.body.toggle;
  
  var query = "UPDATE NotificationSettings SET toggle='" + toggle + "' WHERE email='" + cur_user + "';";
  console.log(query);

  con.query(query, function(err) {
    if (err) {
      console.log("Update settings attempt failed");
      alerts.push({alert: "Updating settings failed.", type: "danger"});
      res.redirect(req.get('referer'));
    } else {
      console.log("Updated settings successfully");
      alerts.push({alert: "Updated settings successfully!", type: "success"});
      res.redirect(req.get('referer'));
    }
  });

});

app.post('/update_angels/:query', urlencodedParser, function(req, res){
  console.log("Received accept/reject response");
  var n = req.body.form_submit;
  var email = req.params.query;
  console.log(n);
  console.log(email);
  var query = "";

  if (n == "accept") {
    console.log("Accepting User");
    query = "UPDATE User SET userStatus = " + "\"accepted\"" + " WHERE email = " + "\"" + email +  "\"" + "";
    console.log(query)
  } else if (n == "reject") {
    query = "DELETE FROM User WHERE email = " + "\"" + email +  "\"" + "";
    console.log("Rejecting User, deleting account");
  }

  con.query(query, function(err) {
    if (err) {
      console.log(err)
      console.log("Error Accepting/Rejecting Gardener");
      alerts.push({alert: "Failed to " + n + " user.", type: "danger"});
      res.redirect(req.get('referer'));
    } else {
      console.log("Successfully Accepted/Rejected Gardener");
      alerts.push({alert: "Successfully " + n + "ed user!", type: "success"});
      res.redirect(req.get('referer'));
    }
  });

});

// SUBMIT ====================================================================================================================================

app.post('/submit_survey/:query',urlencodedParser,  function(req, res) {
  console.log("Received survey response");
  var qID = req.params.query;
  var response = req.body[qID];
  console.log(req.body);

  var query = "UPDATE SurveyResponses SET response='" + response + "' WHERE email='" + cur_user + "' and qID=" + qID + ";";
  console.log(query);

  con.query(query, function(err) {
    if (err) {
      console.log("Submit survey attempt failed.");
      console.log(err);
      alerts.push({alert: "Submitting survey failed, please try again.", type: "danger"});
      res.redirect(req.get('referer'));
    } else {
      console.log("Submit survey success.");
      alerts.push({alert: "Submitted survey successfully!", type: "success"});
      res.redirect(req.get('referer'));
    }
  });
});

app.post('/submit_post', urlencodedParser, function(req, res) {
  console.log("Received post response");
  var postText = req.body.postText;

  if (postText.length > 0) {
    var query = "INSERT INTO Posts (email, role, postText) VALUES ('" + cur_user + "', '" + cur_role + "', '" + postText + "');";
    console.log(query);

    con.query(query, function(err) {
      if (err) {
        console.log("Submit post attempt failed.");
        alerts.push({alert: "Posting failed, please try again.", type: "danger"});
        console.log(err);
      } else {
        console.log("Submit post success.");
        alerts.push({alert: "Posted successfully!", type: "success"});
        //Send notification out to all users and put notification in Notifications Tab table
        var query4 = "SELECT email FROM User";
        con.query(query4, function(err,rows) { // get all target users' email
          if (err) {
            console.log(err);
          } else {
            console.log('Data received from Db:\n');
            console.log(rows);

            rows.forEach((d) => { // use email to send notification to each user
              //send a notification out to all specified users and put the notification in the Notifications Tab table
              if (cur_user.toLowerCase() != d.email.toLowerCase()) {
                var content = "New Post: " + postText;
                var query6 = "INSERT INTO Notifications (email, content) VALUES ('" + d.email + "', '" + content + "');";
                con.query(query6, function(err){
                  if (err) {
                    console.log(err);
                  } else {
                    con.query("SELECT * FROM NotificationSettings WHERE email = '" + d.email + "';", function(err, rows) {
                      if (err) {
                        console.log(err);
                      } else {
                        console.log('Data received from Db:\n');
                        console.log(rows);
    
                        rows.forEach((data) => {
                          console.log(rows[0].toggle);

                          var toggle = rows[0].toggle;
                          let message = ["Someone has created a new post, check it out!", "A new post has been uploaded to the Community Feed.", "Take a look at the Community Feed, someone has uploaded a new post!"];
                          var rand = Math.round(Math.random() * 3) - 1;
                          if (toggle == 'On') {
                            //sends an email out to specified users
                            var nodemailer = require('nodemailer');

                            var transporter = nodemailer.createTransport({
                              service: 'gmail',
                              auth: {
                                user: 'historicwestsidegardenstest@gmail.com',
                                pass: 'testing12345!'
                              }
                            });

                            var mailOptions = {
                              from: 'historicwestsidegardenstest@gmail.com',
                              to: d.email,
                              subject: 'A New Post Has Been Created',
                              text: message[rand]
                            };

                            transporter.sendMail(mailOptions, function(error, info){
                              if (error) {
                                console.log(error);
                              } else {
                                console.log('Email sent: ' + info.response);
                              }
                            });
                          }
                        });
                      }
                    });
                  }
                });
              }
            });
          }
        });
      }
    });
  }
  res.sendFile(path.join(__dirname,'./html/home.html'));
});

app.post('/submit_check_in', urlencodedParser, function(req, res) {
  console.log("Received check in");
  var checkText = req.body.checkText;
  var gardenerText = req.body.gardenerText;

  if (checkText.length > 0) {
    var query = "INSERT INTO CheckIn (angel, gardener, checkText) VALUES ('" + cur_user + "', '" + gardenerText + "', '" + checkText + "');";
    console.log(query);

    con.query(query, function(err) {
      if(err) {
        console.log("Submit check in attempt failed.");
        alerts.push({alert: "Check in failed, please try again.", type: "danger"});
        console.log(err);
      } else {
        console.log("Submit check in success.");
        alerts.push({alert: "Created check in successfully!", type: "success"});
      }
    });
  }
  res.redirect(req.get('referer'));
});

app.post('/submit_comment', urlencodedParser, function(req, res) {
  console.log("Received comment response");
  var commentText = req.body.commentText;

  if (commentText.length > 0) {
    var query = "INSERT INTO Comments (email, role, postId, commentText) VALUES ('" + cur_user + "', '" + cur_role + "', '" + cur_post + "', '" + commentText + "');";
    console.log(query);

    con.query(query, function(err) {
      if(err) {
        console.log("Submit comment attempt failed.");
        alerts.push({alert: "Commenting failed, please try again.", type: "danger"});
        throw err;
      } else {
        console.log("Submit comment success.");
        alerts.push({alert: "Commented successfully!", type: "success"});

        //send a notification out to owner of the post and put the notification in the Notifications Tab table
        var query2 = "SELECT email FROM Posts WHERE postId=" + cur_post;
        console.log(query2);

        con.query(query2, function(err, rows) {
          if (err) {
            console.log(err);
          } else {
            console.log('Data received from Db:\n');
            console.log(rows);
            var email = rows[0].email;
            //send a notification to owner of post
            if (cur_user.toLowerCase() != email.toLowerCase()) {
              var content = "New Comment: " + commentText;
              var query3 = "INSERT INTO Notifications (email, content) VALUES ('" + email + "', '" + content + "');";
              con.query(query3, function(err){
                if (err) {
                  console.log(err);
                } else {
                  con.query("SELECT * FROM NotificationSettings WHERE email = '" + email + "';", function(err, rows) {
                    if (err) {
                      console.log(err);
                    } else {
                      console.log('Data received from Db:\n');
                      console.log(rows);
    
                      rows.forEach((data) => {
                        console.log(rows[0].toggle);

                        var toggle = rows[0].toggle;
                        let message = ["Someone has responded to your post, check it out!", "A new comment has appeared on your post.", "Take a look at your post, someone has commented!"];
                        var rand = Math.round(Math.random() * 3) - 1;
                        if (toggle == 'On') {
                          //sends an email out to specified users
                          var nodemailer = require('nodemailer');

                          var transporter = nodemailer.createTransport({
                            service: 'gmail',
                            auth: {
                              user: 'historicwestsidegardenstest@gmail.com',
                              pass: 'testing12345!'
                            }
                          });

                          var mailOptions = {
                            from: 'historicwestsidegardenstest@gmail.com',
                            to: email,
                            subject: 'New Comment Made on Post',
                            text: message[rand]
                          };

                          transporter.sendMail(mailOptions, function(error, info){
                            if (error) {
                              console.log(error);
                            } else {
                              console.log('Email sent: ' + info.response);
                            }
                          });
                        }
                      });
                    }
                  });
                }
              });
            }
          }
        });
      }
    });
  }
  res.sendFile(path.join(__dirname, './html/posts.html'));
});

app.post('/submit_survey_question', urlencodedParser, function(req, res) {
  console.log("Received survey question");
  console.log(req.body);
  var question = req.body.question;
  var targetUsers = req.body.targetUsers;
  var questionType = req.body.questionType;
  var success = true;

  var query = "INSERT INTO SurveyQuestions (question, questionType) VALUES ('" + question + "', '" + questionType + "');";
  console.log(query);

  con.query(query, function(err) { // insert into SurveyQuestions
    if (err) {
      console.log("Submit survey question failed.");
      success = false;
      alerts.push({alert: "Submitting survey question failed, please try again", type: "danger"});
      console.log(err);
    } else {
      var query2 = "SELECT qID FROM SurveyQuestions ORDER BY qID DESC LIMIT 1;";
      con.query(query2, function(err,rows) { // get qID to insert into SurveyAnswers and SurveyResponses
          if (err) {
            success = false;
            console.log(err);
          }
          else {
            console.log('Data received from Db:\n');
            console.log(rows);
            var qID = rows[0].qID;

            if (questionType == "mc") { // insert all the answer choices for multiple choice
              var choices = req.body.choices;
              choices.forEach((choice) => {
                var query3 = "INSERT INTO SurveyAnswers (qID, answerChoice) VALUES ('" + qID + "', '" + choice + "');";
                console.log(query3);
                con.query(query3, function(err) {
                  if (err) {
                    success = false;
                    console.log(err);
                  }
                });
              });
            }

            if (success) {
              var query4 = "SELECT email FROM User";
              if (targetUsers != 0) {
                query4 += " WHERE role=" + targetUsers + ";"; 
              }
              con.query(query4, function(err,rows) { // get all target users' email
                if (err) {
                  success = false;
                  console.log(err);
                }

                console.log('Data received from Db:\n');
                console.log(rows);

                rows.forEach((d) => { // insert emails into SurveyResponses
                  if (success) {
                    var query5 = "INSERT INTO SurveyResponses (email, qID, response) VALUES ('" + d.email + "', '" + qID + "', '');";
                    console.log(query5);
                    con.query(query5, function(err){
                      success = false;
                      console.log(err);
                    });
                    //send a notification out to all specified users and put the notification in the Notifications Tab table
                    var content = "New Survey: " + question;
                    var query6 = "INSERT INTO Notifications (email, content) VALUES ('" + d.email + "', '" + content + "');";
                    con.query(query6, function(err){
                      if (err) {
                        success = false;
                        console.log(err);
                      } else {
                        con.query("SELECT * FROM NotificationSettings WHERE email = '" + d.email + "';", function(err, rows) {
                          if (err) {
                            success = false;
                            console.log(err);
                          } else {
                            console.log('Data received from Db:\n');
                            console.log(rows);

                            rows.forEach((data) => {
                              console.log(rows[0].toggle);
  
                              var toggle = rows[0].toggle;
                              let message = ["A new survey is out, please complete it!", "We have just release a new survey, check it out!", "Please complete the new survey in the survey tab!"];
                              var rand = Math.round(Math.random() * 3) - 1;
                              if (toggle == 'On') {
                                //sends an email out to specified users
                                var nodemailer = require('nodemailer');

                                var transporter = nodemailer.createTransport({
                                  service: 'gmail',
                                  auth: {
                                    user: 'historicwestsidegardenstest@gmail.com',
                                    pass: 'testing12345!'
                                  }
                                });

                                var mailOptions = {
                                  from: 'historicwestsidegardenstest@gmail.com',
                                  to: d.email,
                                  subject: 'New Survey to Complete',
                                  text: message[rand]
                                };

                                transporter.sendMail(mailOptions, function(error, info){
                                  if (error) {
                                    console.log(error);
                                  } else {
                                    console.log('Email sent: ' + info.response);
                                  }
                                });
                              }
                            });
                          }
                        });
                      }
                    });
                  }
                });
              });
            }
          }
      });
    }
  });
  if (success) {
    alerts.push({alert: "Created survey successfully!", type: "success"});
  } else {
    alerts.push({alert: "Creating survey failed, please try again.", type: "danger"});
  }
  res.sendFile(path.join(__dirname, './html/create-survey.html'));
});

// DELETE ====================================================================================================================================

app.post('/delete_user', urlencodedParser, function(req, res) {
  var delete_email = req.body.delete_email;
  
  var query = "DELETE from User WHERE email='" + delete_email + "';";
  console.log(query);

  con.query(query, function(err) {
    if (err) {
      console.log("Delete attempt failed");
      alerts.push({alert: "Deleting user failed.", type: "danger"});
      res.redirect(req.get('referer'));
    } else {
      console.log("Deleted user successfully");
      alerts.push({alert: "Deleted user successfully!", type: "success"});
      res.redirect(req.get('referer'));
    }
  });

});

app.post('/delete_survey',urlencodedParser,  function(req, res) {
  console.log("Received delete survey response");
  var id = req.body.delete_id;
  var question = req.body.delete_question;
  console.log(req.body);
  var content = "New Survey: " + question;
  var query = "DELETE FROM Notifications WHERE content = '" + content + "';";
  console.log(query);
  con.query(query, function(err) {
    if (err) {
      console.log("Delete survey attempt failed.");
      console.log(err)
      alerts.push({alert: "Deleting survey failed, please try again.", type: "danger"});
      res.redirect(req.get('referer'));
    } else {
      query2 = "DELETE FROM SurveyQuestions where qID = " + id + ";"
      console.log(query2);
      con.query(query2, function(err){
        if (err) {
          console.log("Delete survey attempt failed.");
          console.log(err)
          alerts.push({alert: "Deleting survey failed, please try again.", type: "danger"});
          res.redirect(req.get('referer'));
        } else {
          console.log("Delete survey success."); 
          alerts.push({alert: "Deleted survey successfully!", type: "success"});
          res.redirect(req.get('referer'));
        }
      });
    }
  });
});

app.post('/delete_comment', urlencodedParser, function(req, res){
  console.log("Deleting comment");
  var id = req.body.commentId;

  var query = "DELETE FROM Comments WHERE commentId = "+id+"";
  console.log(query);

  con.query(query, function(err) {
    if (err) {
      console.log(err)
      console.log("Error Deleting Comment");
      alerts.push({alert: "Deleting comment failed, please try again.", type: "danger"});
    } else {
      console.log("Successfully Deleted Comment");
      alerts.push({alert: "Deleted comment successfully!", type: "success"}); 
    }
  });

  res.sendFile(path.join(__dirname, './html/posts.html'));
});

app.post('/delete_post', urlencodedParser, function(req, res){
  console.log("Deleting post");
  var id = req.body.postId;

  var query = "DELETE FROM Posts WHERE postId = "+id+"";
  console.log(query);

  con.query(query, function(err) {
    if (err) {
      console.log(err)
      console.log("Error Deleting Post");
      alerts.push({alert: "Deleting post failed, please try again.", type: "danger"});
    } else {
      console.log("Successfully Deleted Post");
      alerts.push({alert: "Deleted post successfully!", type: "success"}); 
    }
  });
  res.sendFile(path.join(__dirname, './html/home.html'));
});

app.get('/pull_user_role_status', urlencodedParser, function(req, res){
  console.log("Pulling user role/status");
  con.query("SELECT email, role, userStatus FROM User WHERE email = '"+cur_user+"'", function(err,rows) {
      if (err) throw err;
      console.log('Data received from Db:\n');
      console.log(rows);
      res.json(rows)
  });
});
