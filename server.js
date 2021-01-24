var express = require('express');
const PORT = process.env.PORT || 5000;
const INDEX = '/index.html';

const server = express().use((req, res) => res.sendFile(INDEX, { root: __dirname })).listen(PORT, () => console.log('Listening on 3000'));


const io = require('socket.io')(server);
const FRAME_RATE = 10;
const MAX_HP = 100;

var inGame = false;

io.on('connection', socket => {
  console.log("User connected");
  socket.join('Queue');
  socket.gameRoomName = "blank";
  socket.emit('init');
  socket.on('getRooms', ()=>{
    console.log(io.sockets.adapter.rooms);
  });

  io.in('Queue').clients((error, clients) => {
    if (error) throw error;
    if(clients.length > 1){
      console.log("Send Game Request!");
      socket.to('Queue').emit('gameRequest');
    }else{
      socket.to('Queue').emit('searchingForMatch');
    }
  });

  socket.on('sendAcceptRequest', () =>{
    socket.gameRoomName = makeMatchId();
    socket.to('Queue').emit('acceptRequest', {roomName: socket.gameRoomName});
    socket.leave("Queue");
    socket.join(socket.gameRoomName);
    inGame = true;
  });

  socket.on('JoinGameRoom', function(data){
    socket.leave("Queue");
    socket.join(data.roomName);
    socket.gameRoomName = data.roomName;
    inGame = true;
    io.in(socket.gameRoomName).emit("StartGame", socket.id);
  });
  socket.on('leaveGameRoom', ()=>{
    socket.leave(socket.gameRoomName);
    socket.gameRoomName = "blank";
  });


  //Game updates
  socket.on('updatePlayer', data => {
    socket.to(socket.gameRoomName).emit('updateScene', {x: data.pos_x, y: data.pos_y, rot: data.rotation});
    if(data.bullets != null){
      socket.to(socket.gameRoomName).emit('updateBullets', {bullets: data.bullets});
    }
  });

  socket.on('bullet_hit', function(){
    socket.to(socket.gameRoomName).emit('bullet_hit');
  });

  socket.on('GameOver', ()=>{
    socket.to(socket.gameRoomName).emit('GameOver');
    socket.leave(socket.gameRoomName);
    socket.gameRoomName = "blank";
  });
});




io.listen(3000);


function makeMatchId() {
   var result           = '';
   var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
   var charactersLength = characters.length;
   for ( var i = 0; i < 10; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   return "Match:"+result;
}