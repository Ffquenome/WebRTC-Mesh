/*
    +++Cliente to WebRTC_Mesh room+++
    To understand about how this code works, please take a look at the README in the project.
    



    Aqui contem o main antes de eu tirar o sdp

*/


class ClientMesh {

    //Variables that we will use in the code:
    constructor(){
        this.localStream;
        this.localUserId;
        this.connections = [];
        this.events = {};
    }
    


    //Internal Functions that we will call: 

    //Function to work with the the ice candidate:
    gotIceCandidate (fromId, candidate) {
        this.connections[fromId]
        .addIceCandidate(new RTCIceCandidate(candidate))
        .catch(e => console.log('Error: ',e));
    }


    //Function to handle with the events:
    on(eventName, callback){
        if (!this.events[eventName]) {
          this.events[eventName] = [];
        }
    
        this.events[eventName].push(callback);
    }
    

    //Function to handle with the messages:
    emit(eventName, args){
        this.events[eventName].forEach((callback)=>{
            callback(args);
        });
    }




/*
    FunctionCandidate(data){
        const fromId = data.fromId;
         //Works with the candidate part:
        if (fromId !== this.localUserId) {
            console.log(this.socket.id, ' Receive Candidate from ', fromId);
            if (data.candidate) {
                this.gotIceCandidate(fromId, data.candidate);
            }
        };
    };
   
    FunctionSDP(data){
        const fromId = data.fromId;
        if (fromId !== this.localUserId && data.description) { // TODO: precisa desse if?
            console.log(this.socket.id, ' Receive sdp from ', fromId);
            this.connections[fromId].setRemoteDescription(new RTCSessionDescription(data.description))
            .then(() => {
                if (data.description.type === 'offer') {
                    this.connections[fromId].createAnswer()
                    .then((description) => {
                        this.connections[fromId].setLocalDescription(description).then(() => {
                            console.log(this.socket.id, ' Send answer to ', fromId);
                            this.socket.emit('sdp', {
                                type: 'sdp',
                                toId: fromId,
                                description: this.connections[fromId].localDescription
                            });
                        });
                    }).catch(e => console.log('Error: ',e));
                }
            }).catch(e => console.log('Error: ',e)); 
        }
    }
  */


    //Main Functions: 

    //It will control the main part of the client (Signaling parts && Offer/ Answer && Connections).
    connectSocketToSignaling(mediaStream) {
        this.socket = io.connect();

        //When someone connect:
        this.socket.on('connect', () => {
            this.localUserId = this.socket.id;
            //logando o id do user que entrou.
            console.log('localUser', this.localUserId);


            this.socket.on('user-joined', (room) => { //room=data
                const clients = room.clients;
                const joinedUserId = room.joinedUserId;
                console.log(joinedUserId, ' joined');

                
                clients.forEach((userId) => {
                    //Who is entering now, goes inside the if.
                    //The others (that are already in the room) don't go inside.
                    if (!this.connections[userId]) {
                        this.connections[userId] = new RTCPeerConnection(mediaStream);
                        //Melhorar:
                        this.connections[userId].onicecandidate = evt => {

                            if (evt.candidate) {
                                console.log(this.socket.id, ' Send candidate to ', userId);
                                this.socket.emit('candidate',  //TODO: Analisar necessidade dessa descrição.
                               {type: 'candidate', candidate: evt.candidate, toId: userId}); 
                            };
                           
                        };

                        //TODO: arrumar.
                        //New video to the new guy.
                        this.connections[userId].onaddstream = () => { 
                            //const remoteStream = new MediaStream;
                            this.emit('remoteStream', {stream: mediaStream, id:userId});
                            
                        };
                        
                        //Adding the new video.
                        this.connections[userId].addStream(this.localStream);
                        
                    }

                });


                //TODO: encadeamento de promise
                //With more then one, it runs and we send offers to connect
                if (room.count >= 2) {
                    console.log(room.count + ' Guys in the room');
                    this.connections[joinedUserId].createOffer()
                    .then((description) => {
                        this.connections[joinedUserId].setLocalDescription(description)
                        .then(() => {
                            console.log(this.socket.id, ' Send offer to ', joinedUserId);
                            this.socket.emit('sdp', {
                                toId: joinedUserId,  //TODO: Analisar necessidade dessa descrição.
                                description: this.connections[joinedUserId].localDescription,
                                type: 'sdp'
                            });
                        })
                        .catch(e => console.log('Error: ',e));
                    });
                }
                

            });

            
            //Remove the video from the guy that is going out.
            this.socket.on('user-left', (userId) => {
                this.emit('user-left', userId);
            });

            

            this.socket.on('candidate', (data) => {
                const fromId = data.fromId;
                //Works with the candidate part:
                if (fromId !== this.localUserId) {
                   console.log(this.socket.id, ' Receive Candidate from ', fromId);
                   if (data.candidate) {
                       this.gotIceCandidate(fromId, data.candidate);
                   }
               };     
            });


            
            this.socket.on('sdp', (data) => {
                const fromId = data.fromId;
                if (fromId !== this.localUserId && data.description) { // TODO: precisa desse if?
                    console.log(this.socket.id, ' Receive sdp from ', fromId);
                    this.connections[fromId].setRemoteDescription(new RTCSessionDescription(data.description))



                    .then(() => {
                        if (data.description.type === 'offer') {

                            this.connections[fromId].createAnswer()
                            .then((description) => {
                                this.connections[fromId].setLocalDescription(description).then(() => {
                                    console.log(this.socket.id, ' Send answer to ', fromId);
                                    this.socket.emit('sdp', {
                                        type: 'sdp',
                                        toId: fromId,
                                        description: this.connections[fromId].localDescription
                                    });
                                });
                            }).catch(e => console.log('Error: ',e));
                        }
                    }).catch(e => console.log('Error: ',e)); 





                }     
            });



            this.socket.on('offer', (data) => {
                if (data.fromId !== this.localUserId ) { 
                    const fromId = data.fromId;
                    console.log(this.socket.id, ' Receive offer from ', fromId);
                    const con = this.connections[fromId];
                    con.setRemoteDescription(new RTCSessionDescription(data.description))
                    .then(() => con.createAnswer())
                    .then((description) => {con.setLocalDescription(description)})
                    .then(() => {
                        console.log(this.socket.id, ' Send answer to ', fromId);
                        this.socket.emit('answer', {
                            type: 'answer',
                            toId: fromId,
                            description: con.localDescription
                        });
                    })
                    .catch(e => console.log('Error: ',e));
                }     
            })

            this.socket.on('answer', (data) => {
                const fromId = data.fromId;
                console.log('Resposta recebida de:' , data.fromId);
                const con = this.connections[fromId];
                if (con){
                    con.setRemoteDescription(new RTCSessionDescription(data.description))
                    .catch(e => console.log('Error: ',e));
                };
            });








            
        });
    }


    //TODO: DATA CHANNEL
    // Starting the client: 

    //Function to start every thing:
    startLocalStream() {
        navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        })
        .then(mediaStream =>{
            this.localStream = mediaStream;
            this.emit('localStream', mediaStream);
            this.connectSocketToSignaling(mediaStream);
            console.log("Pegando userMedia com constraints:", { video: true,audio: true});
        }).catch(e => console.log('Error: ',e));
    }
} 
