const express = require("express");
const { stat } = require("fs");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);
const { v4: uuidV4 } = require("uuid");

app.set("view engine", "ejs");
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.redirect(`/${uuidV4()}`);
});
app.get("");

app.get("/:room", (req, res) => {
  res.render("room", { roomId: req.params.room });
});

const state = {
  rooms: [],
};
const usersInRoom = {};
io.on("connection", (socket) => {
  socket.on("join-room", (roomId, userId, isStream) => {
    socket.join(roomId);
    if (!state.rooms.includes(roomId)) {
      state.rooms.push(roomId);
      usersInRoom[roomId] = [];
    }
    usersInRoom[roomId].push(userId);
    socket.to(roomId).broadcast.emit("user-connected", userId, isStream);

    //Join
    socket.on("joinEvt", () => {
      socket.to(roomId).broadcast.emit("stateUpdate", usersInRoom[roomId]);
      console.log(usersInRoom);
    });

    //Streaming
    socket.on("stopStream", (streamId) => {
      socket.to(roomId).broadcast.emit("user-disconnected", streamId, true);
    });

    //Disconnect
    socket.on("disconnect", () => {
      socket.to(roomId).broadcast.emit("user-disconnected", userId, false);
      delete usersInRoom[roomId][userId];
    });
  });
});

server.listen(3000);
