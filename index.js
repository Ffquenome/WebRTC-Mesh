//Código da parte do servidor.


const express = require('express'); // pegando a biblioteca express
const server = express();
const http = require('http').Server(server); //server recebendo express
const io = require('socket.io')(http);


server.use(express.static('public'));


//Porta onde esta sendo executado
http.listen(8080, () => {
    console.log('Server está la na porta 8080');
});


//Manda o index pro navegador.
server.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html'); 
});


//Aqui acontece se tiver uma connection (io.on). Basicamente controla a entrada e a saida de pessoas.
io.on('connection', function (socket) {
    io.emit('user-joined', { clients:  Object.keys(io.sockets.clients().sockets), count: io.engine.clientsCount, joinedUserId: socket.id});
    
    socket.on('signaling', function(data) {
        io.to(data.toId).emit('signaling', { fromId: socket.id, ...data });
    });
    socket.on('disconnect', function() {
        io.sockets.emit('user-left', socket.id)
    })
});
