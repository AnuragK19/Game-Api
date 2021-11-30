const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const port = 4000;
const redis = require("redis");
const cors = require("cors");
app.use(cors());

// Configuring body parser middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const client = redis.createClient();
(async () => {
  client.on("error", (err) => console.log("Redis Client Error", err));
  await client.connect();
})();

app.post("/set-user", async (req, res) => {
  const playerName = req.body.username;
  const doesExist = await client.exists(playerName);
  if (doesExist) {
    res.status(200).send({
      success: true,
      msg: "User already exists.Continue using this account?",
    });
  } else {
    await client.set(playerName, "0", (err, reply) => {
      if (err) throw err;
    });
    res.status(200).send({ success: true });
  }
});

app.get("/user-details/:name", async (req, res) => {
  let playerName = req.params.name;
  let playerScore = 0;
  if (playerName) {
    playerScore = await client.get(playerName);
    res.status(200).send({ score: playerScore });
  } else {
    res.status(500).send({ success: false });
  }
});

app.post("/game-points", async (req, res) => {
  const playerName = req.body.username;
  const plusOnePoint = req.body.score;
  if (playerName && plusOnePoint) {
    const existingScore = await client.get(playerName);
    const newScore = parseInt(existingScore) + parseInt(plusOnePoint);
    await client.set(playerName, JSON.stringify(newScore), (err, reply) => {
      if (err) throw err;
    });
    res.status(200).send({ success: true });
  }
});

app.get("/leaderboard-scores", async (req, res) => {
  let allUsers = await client.keys("*");
  if (allUsers.length > 0) {
    let allScores = await client.mGet(allUsers);
    allUsers = allUsers.map((e) => {
      return {
        username: e,
        score: 0,
      };
    });
    let result = (allScores = allScores.map((e, index) => {
      return {
        username: allUsers[index].username,
        score: e,
      };
    }));
    let sortedResult = result.sort((a, b) => (a.score < b.score ? 1 : -1));

    res.status(200).send({ success: true, users: sortedResult });
  } else {
    res.status(500).send({ success: false, message: "No users found" });
  }
});

app.listen(port, (err) => {
  if (err) throw err;
  console.log("Server running");
});
