const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");

require("make-promises-safe");
require("dotenv").config();

mongoose.connect(process.env.MLAB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const schemaUser = new mongoose.Schema(
  {
    userName: String
  },
  { autoIndex: false }
);
const exercise = new mongoose.Schema({
  userId: String,
  userName: String,
  description: String,
  duration: Number,
  date: Date
});

const userModel = mongoose.model("userModel", schemaUser);
const userExercise = mongoose.model("UserExercise", exercise);

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: "not found" });
});

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;

  if (err.errors) {
    // mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || "Internal Server Error";
  }
  res
    .status(errCode)
    .type("txt")
    .send(errMessage);
});

app.post("/api/exercise/new-user", (req, res) => {
  const { username } = req.body;
  userModel.find({ userName: `${username}` }, function(err, query) {
    if (err) {
      return err;
    }
    if (query.length) {
      res.status(400).res("username already taken");
    } else {
      const newUser = new userModel({ userName: `${username}` });
      newUser.save(function(err) {
        if (err) {
          return err;
        }
      });
    }
  });
});
app.get("/api/exercise/users", async(req, res) => {
  const arrOfUser = [];
  await userModel.find({}, function(err, query) {
    if (err) {
      return err;
    }
    for (const user of query) {
      const { userName, _id } = user;
      arrOfUser.push({ username: userName, id: _id });
    }
  });
  res.status(200).res(arrOfUser);
});
app.post("/api/exercise/add", async (req, res) => {
  // userExercise.deleteMany({}, function (err) {
  //     if (err) {
  //         console.log(err);

  //         return err;
  //     }
  // });
  const { userId, description, duration } = req.body;
  let { date = null } = req.body;
  await userModel.find({ _id: userId }, function(err, query) {
    if (err) {
      console.log(err);

      return err;
    }
    if (date === null) {
      date = new Date(Date.now()).toDateString();
    }

    const newExo = new userExercise({
      userId,
      userName: query[0].userName,
      description,
      duration,
      date
    });
    newExo.save(function(err) {
      if (err) {
        console.log(err);

        return err;
      }
    });
    res
      .status(200)
      .res.json({
        userId,
        userName: query[0].userName,
        description,
        duration,
        date
      });
  });
});
app.get("/api/exercise/log", async (req, res) => {
  const { userId, limit = null, from = null } = req.query;
  let { to = null } = req.query;
  await userExercise.find({ userId }, function(err, query) {
    if (err) {
      return err;
    }
    if (to === "") {
      to = new Date(Date.now()).toDateString();
    }

    const userObject = {};
    userObject._id = userId;
    userObject.username = query[0].userName;
    userObject.from = from;
    userObject.to = to;

    let counter = 0;
    const logs = [];
    for (const exercise of query) {
      const { date } = exercise;
      date.toDateString();
      console.log(date);
      if (
        Date.parse(exercise.date) >= Date.parse(from) &&
        Date.parse(exercise.date) <= Date.parse(to)
      ) {
        logs.push({
          description: exercise.description,
          duration: exercise.duration,
          date
        });
      }
      counter++;
    }
    userObject.count = counter;
    userObject.log = logs;

    res.status(200).json(userObject);
  });
});
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
