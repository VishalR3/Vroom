const socket = io("/");
const videoGrid = document.getElementById("video-grid");
let streamPeer;
let streamVideo;
let muteToggle = () => {};
let camToggle = () => {};
let streaming = false;
const myPeer = new Peer(undefined, {
  host: "/",
  port: "3001",
});
const camOptions = {
  video: true,
  audio: true,
};
const myVideo = document.createElement("video");
myVideo.muted = true;
const peers = {};
const connectedUsers = [];
let displayMediaStream;

function connect() {
  try {
    navigator.mediaDevices.getUserMedia(camOptions).then((stream) => {
      addVideoStream(myVideo, stream, myPeer.id);

      myPeer.on("call", (call) => {
        if (!connectedUsers.includes(call.peer)) {
          call.answer(stream);
          const video = document.createElement("video");
          console.log("user prev connected :" + call.peer);
          call.on("stream", (userVideoStream) => {
            addVideoStream(video, userVideoStream, call.peer);
          });
          peers[call.peer] = {
            call: call,
            video: video,
          };
        }
      });
      const audioTracks = stream.getAudioTracks();
      const videoTracks = stream.getVideoTracks();
      //Mute Btn
      document.getElementById("muteBtn").addEventListener("click", () => {
        muteToggle();
      });
      muteToggle = () => {
        if (audioTracks[0].enabled) {
          audioTracks[0].enabled = false;
          document.getElementById("muteBtn").classList.add("btn-danger");
          document.getElementById("muteBtn").classList.remove("btn-light");
        } else {
          audioTracks[0].enabled = true;
          document.getElementById("muteBtn").classList.remove("btn-danger");
          document.getElementById("muteBtn").classList.add("btn-light");
        }
      };
      //Cam Btn
      document.getElementById("camBtn").addEventListener("click", () => {
        camToggle();
      });
      camToggle = () => {
        if (videoTracks[0].enabled) {
          videoTracks[0].enabled = false;
          document.getElementById("camBtn").classList.add("btn-danger");
          document.getElementById("camBtn").classList.remove("btn-light");
        } else {
          videoTracks[0].enabled = true;
          document.getElementById("camBtn").classList.remove("btn-danger");
          document.getElementById("camBtn").classList.add("btn-light");
        }
      };
      socket.on("user-connected", (userId, isStream) => {
        setTimeout(() => {
          connectToNewUser(userId, stream, isStream);
        }, 100);
      });
      socket.on("stateUpdate", (users) => {
        console.log("Updated Here");
        console.log(users);
        users.forEach((user) => {
          if (!connectedUsers.includes(user) && user !== myPeer.id) {
            connectToNewUser(user, stream);
          }
        });
      });
    });
  } catch (e) {
    document.querySelector("#instructions").style.display = "block";
  }
}
connect();
socket.on("user-disconnected", (userId, isStream) => {
  if (peers[userId]) {
    peers[userId].call.close();
    if (!isStream) {
      peers[userId].video.remove();
    }
    console.log(peers[userId]);
  }
  if (isStream) {
    document.getElementById("shareBtn").disabled = false;
    const grid = document.getElementById("video-grid");
    document.getElementById("videosArea").append(grid);
    document.getElementById("streamLayout").style.display = "none";
    document.querySelectorAll(".usersVideo").forEach((card) => {
      card.classList.add("col-md-4");
      card.classList.remove("col-12");
    });
    document.querySelector(".controls-bar").style.placeItems = "center";
  }
});

myPeer.on("open", (id) => {
  socket.emit("join-room", ROOM_ID, id, false);
});

function connectToNewUser(userId, stream, isStream) {
  const call = myPeer.call(userId, stream);
  let video;
  if (isStream) {
    video = document.getElementById("streamVideo");
  } else {
    video = document.createElement("video");
  }
  call.on("stream", (userVideoStream) => {
    addVideoStream(video, userVideoStream, userId, isStream);
  });
  call.on("close", () => {
    if (video.id !== "streamVideo") {
      video.remove();
    }
  });

  peers[userId] = {
    call: call,
    video: video,
  };
}
function connectToNewUserWhileStreaming(userId, stream) {
  streamPeer.call(userId, stream);
}

function addVideoStream(video, stream, userId, isStream) {
  // const card = document.createElement("div");
  // card.classList = " videoCard col-md-4";
  video.srcObject = stream;
  video.controls = false;
  if (!isStream) {
    video.classList = "col-md-4 usersVideo mb-3";
  }
  if (!isStream) {
    video.id = userId;
  }

  connectedUsers.push(userId);
  video.addEventListener("dblclick", () => {
    if (video.requestFullscreen) {
      video.requestFullscreen();
    } else if (video.webkitRequestFullscreen) {
      /* Safari */
      video.webkitRequestFullscreen();
    } else if (video.msRequestFullscreen) {
      /* IE11 */
      video.msRequestFullscreen();
    }
    console.log("dblclicked");
  });
  video.addEventListener("loadedmetadata", () => {
    video.play();
  });
  if (!isStream) {
    videoGrid.prepend(video);
  }
  if (isStream) {
    if (streamPeer === undefined) {
      document.getElementById("shareBtn").disabled = true;
    }
    const grid = document.getElementById("video-grid");
    document.getElementById("usersSpace").append(grid);
    document.getElementById("streamLayout").style.display = "flex";
    document.querySelectorAll(".usersVideo").forEach((card) => {
      card.classList.remove("col-md-4");
      card.classList.add("col-12");
    });
    document.querySelector(".controls-bar").style.placeItems = "end";
  }
}

//Join Btn
document.getElementById("joinBtn").addEventListener("click", () => {
  socket.emit("joinEvt");
  document.querySelector(".preText").style.display = "none";
  document.getElementById("joinBtn").style.display = "none";
});

// Screen Share
document.getElementById("shareBtn").addEventListener("click", async () => {
  if (!streaming) {
    const gdmOptions = {
      video: true,
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44100,
      },
    };
    displayMediaStream = await navigator.mediaDevices.getDisplayMedia(
      gdmOptions
    );
    streaming = true;
    streamPeer = new Peer(undefined, {
      host: "/",
      port: "3001",
    });
    streamPeer.on("open", (id) => {
      socket.emit("join-room", ROOM_ID, id, true);
      streamVideo = document.getElementById("streamVideo");
      streamVideo.muted = true;
      addVideoStream(streamVideo, displayMediaStream, streamPeer.id, true);
    });
    streamPeer.on("call", (call) => {
      call.answer(displayMediaStream);
    });
    document.getElementById("shareBtn").classList.add("btn-danger");
    document.getElementById("shareBtn").classList.remove("btn-secondary");
  } else {
    document.getElementById("shareBtn").classList.add("btn-secondary");
    document.getElementById("shareBtn").classList.remove("btn-danger");
    socket.emit("stopStream", streamPeer.id);
    streaming = false;
    const grid = document.getElementById("video-grid");
    document.getElementById("videosArea").append(grid);
    document.getElementById("streamLayout").style.display = "none";
    document.querySelectorAll(".usersVideo").forEach((card) => {
      card.classList.add("col-md-4");
      card.classList.remove("col-12");
    });
    document.querySelector(".controls-bar").style.placeItems = "center";
  }
});

//Key Shortcuts
document.addEventListener("keyup", (e) => {
  if (e.key == "m") {
    muteToggle();
  }
  if (e.key == "n") {
    camToggle();
  }
});
