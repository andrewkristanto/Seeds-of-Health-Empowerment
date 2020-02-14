drop database histor72_sapp;
CREATE database histor72_sapp;
use histor72_sapp;


CREATE TABLE User (
	email VARCHAR(50) NOT NULL,
    password VARCHAR(200) NOT NULL,
	firstName VARCHAR(50) NOT NULL,
	lastName VARCHAR(50) NOT NULL,
	street VARCHAR(50) NOT NULL,
	city VARCHAR(50) NOT NULL,
	state VARCHAR(50) NOT NULL DEFAULT "GA",
	zipcode VARCHAR(50) NOT NULL,
    phoneNumber VARCHAR(50) NOT NULL,
    userStatus VARCHAR(50) NOT NULL DEFAULT "Pending",
    lastLogin Date NOT NULL,
	PRIMARY KEY (email)
);
CREATE TABLE Angel (
	email VARCHAR(50) NOT NULL,
	PRIMARY KEY (email),
	FOREIGN KEY (email)
		REFERENCES User (email)
			ON DELETE CASCADE
			ON UPDATE CASCADE
);
CREATE TABLE Gardener (
	email VARCHAR(50) NOT NULL,
    coach VARCHAR(50) NOT NULL,
	PRIMARY KEY (email),
	FOREIGN KEY (email)
		REFERENCES User (email)
			ON DELETE CASCADE
			ON UPDATE CASCADE
            ,
	FOREIGN KEY (coach)
		REFERENCES Angel (email)
			ON DELETE CASCADE
			ON UPDATE CASCADE
);
CREATE TABLE Admin (
	email VARCHAR(50) NOT NULL,
	PRIMARY KEY (email),
	FOREIGN KEY (email)
		REFERENCES User (email)
			ON DELETE CASCADE
			ON UPDATE CASCADE
);
CREATE TABLE SurveyQuestions (
	question VARCHAR(100) NOT NULL,
	releaseDate Date NOT NULL,
	questionType VARCHAR(50) NOT NULL,
	PRIMARY KEY (question, releaseDate)
);
CREATE TABLE SurveyResponses (
	question VARCHAR(100) NOT NULL,
	releaseDate Date NOT NULL,
    email VARCHAR(50) NOT NULL,
	response VARCHAR(200) NOT NULL,
	PRIMARY KEY (question, response, releaseDate, email),
	FOREIGN KEY (question, releaseDate)
		REFERENCES SurveyQuestions (question, releaseDate)
			ON DELETE CASCADE
			ON UPDATE CASCADE,
	FOREIGN KEY (email)
		REFERENCES User (email)
			ON DELETE CASCADE
			ON UPDATE CASCADE
);
CREATE TABLE SurveyAnswers (
	question VARCHAR(50) NOT NULL,
	releaseDate Date NOT NULL,
	answerChoice VARCHAR(50) NOT NULL,
	PRIMARY KEY (question, releaseDate, answerChoice),
	FOREIGN KEY (question, releaseDate)
		REFERENCES SurveyQuestions (question, releaseDate)
			ON DELETE CASCADE
			ON UPDATE CASCADE
);
CREATE TABLE CheckIn (
	angel VARCHAR(50) NOT NULL,
    gardener VARCHAR(50) NOT NULL,
	checkText VARCHAR(300) NOT NULL,
	checkDate DATE NOT NULL,
    checkTime TIME NOT NULL,
	PRIMARY KEY (angel, gardener, checkDate, checkTime),
    FOREIGN KEY (angel)
		REFERENCES Angel (email)
			ON DELETE CASCADE
			ON UPDATE CASCADE,
	FOREIGN KEY (gardener)
		REFERENCES Gardener (email)
			ON DELETE CASCADE
			ON UPDATE CASCADE
);
CREATE TABLE Posts (
	email VARCHAR(50) NOT NULL,
	accountType VARCHAR(50) NOT NULL,
    postId VARCHAR(50) NOT NULL,
	postText VARCHAR(300) NOT NULL,
	postDate DATE NOT NULL,
    postTime TIME NOT NULL,
	PRIMARY KEY (postId),
    FOREIGN KEY (email)
		REFERENCES User (email)
			ON DELETE CASCADE
			ON UPDATE CASCADE
);
CREATE TABLE Comments (
	email VARCHAR(50) NOT NULL,
	accountType VARCHAR(50) NOT NULL,
    postId VARCHAR(50) NOT NULL,
	postText VARCHAR(300) NOT NULL,
	postDate DATE NOT NULL,
    postTime TIME NOT NULL,
	PRIMARY KEY (email, postId),
    FOREIGN KEY (email)
		REFERENCES User (email)
			ON DELETE CASCADE
			ON UPDATE CASCADE,
	FOREIGN KEY (postId)
		REFERENCES Posts (postId)
			ON DELETE CASCADE
			ON UPDATE CASCADE
);
CREATE TABLE Notifications (
	email VARCHAR(50) NOT NULL,
	role ENUM('Angel', 'Gardener', 'All', 'Private') NOT NULL,
	notifDate Date NOT NULL,
    notifTime Time NOT NULL,
	content VARCHAR(250) NOT NULL,
	PRIMARY KEY (email, notifDate, notifTime, content),
    FOREIGN KEY (email)
		REFERENCES User (email)
			ON DELETE CASCADE
			ON UPDATE CASCADE
);
CREATE TABLE NotificationSettings (
	email VARCHAR(50) NOT NULL,
	frequency ENUM('Immediate', 'Every 8 hours', 'Once a day') NOT NULL,
	method ENUM('Phone', 'Email', 'Email and Phone') NOT NULL,
	toggle ENUM('On', 'Off') NOT NULL,
	PRIMARY KEY (email),
    FOREIGN KEY (email)
		REFERENCES User (email)
			ON DELETE CASCADE
			ON UPDATE CASCADE
);