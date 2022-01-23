const socket = io("/");
const videoGrid = document.getElementById("video-grid");
const myPeer = new Peer(undefined, {
  host: "192.168.235.130",
  port: "3001",
});
const myVideo = document.createElement("video");
myVideo.muted = true;
const peers = {};
let displayMediaStream;
navigator.mediaDevices
  .getUserMedia({
    video: true,
    audio: true,
  })
  .then((stream) => {
    addVideoStream(myVideo, stream);

    myPeer.on("call", (call) => {
      call.answer(stream);
      const video = document.createElement("video");
      call.on("stream", (userVideoStream) => {
        addVideoStream(video, userVideoStream);
      });
      peers[call.peer] = call;
    });
    myPeer.on("data", (data) => {
      console.log("Recieved ", data);
    });

    socket.on("user-connected", (userId) => {
      console.log("user Connected :" + userId);
      connectToNewUser(userId, stream);
    });
  });
socket.on("user-disconnected", (userId) => {
  peers[userId].call.close();
  if (peers[userId]) {
    console.log(peers[userId]);
  }
});

myPeer.on("open", (id) => {
  socket.emit("join-room", ROOM_ID, id);
});

function connectToNewUser(userId, stream) {
  const call = myPeer.call(userId, stream);
  const video = document.createElement("video");
  call.on("stream", (userVideoStream) => {
    addVideoStream(video, userVideoStream);
  });
  call.on("close", () => {
    video.remove();
  });

  peers[userId] = {
    call: call,
    video: video,
  };
}

function addVideoStream(video, stream) {
  video.srcObject = stream;
  video.addEventListener("loadedmetadata", () => {
    video.play();
  });
  videoGrid.append(video);
}

let i = 1;
let image = document.getElementById("image");
let vElement = document.createElement("video");
socket.on("streamR", (stream) => {
  console.log(stream);
  vElement.srcObject = stream;
});
vElement.addEventListener("loadedmetadata", () => {
  vElement.play();
});
document.getElementById("screen").append(vElement);

document.getElementById("shareBtn").addEventListener("click", async () => {
  if (!displayMediaStream) {
    displayMediaStream = await navigator.mediaDevices.getDisplayMedia();
  }
  // socket.emit("streamShare", displayMediaStream);

  // let canvas = document.createElement('canvas')
  // let context = canvas.getContext('2d');

  // canvas.width = 900;
  // canvas.height = 700;

  // context.width = canvas.width;
  // context.height = canvas.height;
  // let video = document.createElement('video');
  // video.srcObject = displayMediaStream;
  // video.addEventListener('loadedmetadata', () => {
  //       video.play();
  // })
  // document.getElementById('screen').append(video);
  // document.getElementById('screen').append(canvas);

  // const draw = ()=>{
  // context.drawImage(video,0,0,context.width,context.height);
  // socket.emit('streamShare',canvas.toDataURL('image/webp'));

  //   window.requestAnimationFrame(draw);
  // }
  // draw();
});
