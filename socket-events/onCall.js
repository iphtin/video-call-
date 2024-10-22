import { io } from '../server.js';

const onCall = async (partcipants) => {
    console.log("Participants", partcipants);
   if(partcipants.receiver.socketId) {
    io.to(partcipants.receiver.socketId).emit('incomingCall', partcipants)
   }
}


export default onCall;