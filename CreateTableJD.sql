use histor72_sapp;

CREATE TABLE User (
	email VARCHAR(50) NOT NULL,
    role TINYINT NOT NULL DEFAULT 0,
    password VARCHAR(200) NOT NULL,
	firstName VARCHAR(50) NOT NULL,
	lastName VARCHAR(50) NOT NULL,
	street VARCHAR(50) NOT NULL,
	city VARCHAR(50) NOT NULL,
	state VARCHAR(50) NOT NULL DEFAULT "GA",
	zipcode VARCHAR(50) NOT NULL,
    phoneNumber VARCHAR(50) NOT NULL,
    userStatus VARCHAR(50) NOT NULL DEFAULT "Pending",
    lastLogin timestamp default current_timestamp,
	PRIMARY KEY (email, role)
);

DELIMITER //
CREATE TRIGGER `user_update_to_gmt-5` BEFORE INSERT ON `User` FOR EACH ROW BEGIN
set new.lastLogin=addtime(current_timestamp, '01:00:00');
END//
DELIMITER ;

DELIMITER //
CREATE TRIGGER `user_update_login_to_gmt-5` BEFORE UPDATE ON `User` FOR EACH ROW BEGIN
set new.lastLogin=addtime(current_timestamp, '01:00:00');
END//
DELIMITER ;

CREATE TABLE SurveyQuestions (
    question VARCHAR(100) NOT NULL,
    qID INT NOT NULL AUTO_INCREMENT,
    releaseDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    questionType VARCHAR(50) NOT NULL,
    PRIMARY KEY (qID)
);

DELIMITER //
CREATE TRIGGER `survey_question_update_to_gmt-5` BEFORE INSERT ON `SurveyQuestions` FOR EACH ROW BEGIN
set new.releaseDate=addtime(current_timestamp, '01:00:00');
END//
DELIMITER ;
CREATE TABLE SurveyResponses (
	qID int NOT NULL,
    email VARCHAR(50) NOT NULL,
	response VARCHAR(250),
	PRIMARY KEY (qID, response, email),
	FOREIGN KEY (qID)
		REFERENCES SurveyQuestions (qID)
			ON DELETE CASCADE
			ON UPDATE CASCADE,
	FOREIGN KEY (email)
		REFERENCES User (email)
			ON DELETE CASCADE
			ON UPDATE CASCADE
);

CREATE TABLE SurveyAnswers (
	qID int NOT NULL,
	answerChoice VARCHAR(50) NOT NULL,
	PRIMARY KEY (qID, answerChoice),
	FOREIGN KEY (qID)
		REFERENCES SurveyQuestions (qID)
			ON DELETE CASCADE
			ON UPDATE CASCADE
);
CREATE TABLE CheckIn (
	angel VARCHAR(50) NOT NULL,
    gardener VARCHAR(50) NOT NULL,
	checkText VARCHAR(300) NOT NULL,
	checkDate timestamp default current_timestamp,
	PRIMARY KEY (angel, gardener, checkDate),
    FOREIGN KEY (angel)
		REFERENCES User (email)
			ON DELETE CASCADE
			ON UPDATE CASCADE,
	FOREIGN KEY (gardener)
		REFERENCES User (email)
			ON DELETE CASCADE
			ON UPDATE CASCADE
);


DELIMITER //
CREATE TRIGGER `check_in_update_to_gmt-5` BEFORE INSERT ON `CheckIn` FOR EACH ROW BEGIN
set new.checkDate=addtime(current_timestamp, '01:00:00');
END//
DELIMITER ;
CREATE TABLE Posts (
	email VARCHAR(50) NOT NULL,
	role TINYINT NOT NULL,
    postId int NOT NULL auto_increment,
	postText VARCHAR(300) NOT NULL,
	postDate timestamp default current_timestamp,
	PRIMARY KEY (postId),
    FOREIGN KEY (email, role)
		REFERENCES User (email, role)
			ON DELETE CASCADE
			ON UPDATE CASCADE
);
DELIMITER //
CREATE TRIGGER `post_update_to_gmt-5` BEFORE INSERT ON `Posts` FOR EACH ROW BEGIN
set new.postDate=addtime(current_timestamp, '01:00:00');
END//
DELIMITER ;
CREATE TABLE Comments (
	email VARCHAR(50) NOT NULL,
	role TINYINT NOT NULL,
    postId int NOT NULL,
	commentText VARCHAR(300) NOT NULL,
	commentDate timestamp default current_timestamp,
	PRIMARY KEY (email, postId, commentDate),
    FOREIGN KEY (email, role)
		REFERENCES User (email, role)
			ON DELETE CASCADE
			ON UPDATE CASCADE,
	FOREIGN KEY (postId)
		REFERENCES Posts (postId)
			ON DELETE CASCADE
			ON UPDATE CASCADE
);
DELIMITER //
CREATE TRIGGER `comment_update_to_gmt-5` BEFORE INSERT ON `Comments` FOR EACH ROW BEGIN
set new.commentDate=addtime(current_timestamp, '01:00:00');
END//
DELIMITER ;
CREATE TABLE Notifications (
	email VARCHAR(50) NOT NULL,
	role ENUM('Angel', 'Gardener', 'All', 'Private') NOT NULL,
	notifDate timestamp default current_timestamp,
	content VARCHAR(250) NOT NULL,
	PRIMARY KEY (email, notifDate, content),
    FOREIGN KEY (email)
		REFERENCES User (email)
			ON DELETE CASCADE
			ON UPDATE CASCADE
);
DELIMITER //
CREATE TRIGGER `notif_update_to_gmt-5` BEFORE INSERT ON `Notifications` FOR EACH ROW BEGIN
set new.notifDate=addtime(current_timestamp, '01:00:00');
END//
DELIMITER ;
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