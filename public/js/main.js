/*

    +++Cliente to WebRTC_Mesh room+++
    To undrestand about how this code works, please take a look at the README in the project.

    
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
 


    //Main Functions: 

    //It will controll the main part of the client (Signaling parts && Offer/ Answer && Connections).
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
                    //The others (that are aredy in the room) dont go inside.
                    if (!this.connections[userId]) {
                        this.connections[userId] = new RTCPeerConnection(mediaStream);
                        //Melhorar:
                        this.connections[userId].onicecandidate = evt => {

                            if (evt.candidate) {
                                console.log(this.socket.id, ' Send candidate to ', userId);
                                this.socket.emit('signaling', 
                               {type: 'candidate', candidate: evt.candidate, toId: userId}); 
                            };
                           
                        };

                        //New video to the new guy.
                        this.connections[userId].onaddstream = () => { 
                            //const remoteStream = new MediaStream;
                            this.emit('remoteStream', {stream: mediaStream, id:userId});
                            
                        };
                        
                        //Adding the new video.
                        this.connections[userId].addStream(this.localStream);
                        
                    }

                });


                //With more then one, it runs and we send offers to connect
                if (room.count >= 2) {
                    console.log(room.count + ' Guys in the room');
                    this.connections[joinedUserId].createOffer()
                    .then((description) => {
                        this.connections[joinedUserId].setLocalDescription(description)
                        .then(() => {
                            console.log(this.socket.id, ' Send offer to ', joinedUserId);
                            this.socket.emit('signaling', {
                                toId: joinedUserId,
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

            
            //Maneger of the signaling messages
            this.socket.on('signaling', (data) => {
                const fromId = data.fromId;
                switch (data.type) {


                case 'candidate':
                //Works with the candidate part:
                if (fromId !== this.localUserId) {
                    console.log(this.socket.id, ' Receive Candidate from ', fromId);
                    if (data.candidate) {
                        this.gotIceCandidate(fromId, data.candidate);
                    }
                };


                case 'sdp': //Session Description Protocol
                //Works with the offers and answers:
                if (fromId !== this.localUserId && data.description) {
                    console.log(this.socket.id, ' Receive sdp from ', fromId);
                    this.connections[fromId].setRemoteDescription(new RTCSessionDescription(data.description))
                    .then(() => {
                        if (data.description.type === 'offer') {
                            this.connections[fromId].createAnswer()
                            .then((description) => {
                                this.connections[fromId].setLocalDescription(description).then(() => {
                                    console.log(this.socket.id, ' Send answer to ', fromId);
                                    this.socket.emit('signaling', {
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
            });
        });
    }



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