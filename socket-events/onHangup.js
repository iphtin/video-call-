import { io } from '../server.js';

const onHangup = async (data) => {
    let socketIdToEmitTo;

    if(data?.ongoingCall.partcipants.caller.userId === data.userHangupId) {
        socketIdToEmitTo = data?.ongoingCall.partcipants.receiver.socketId
    }else {
        socketIdToEmitTo = data?.ongoingCall.partcipants.caller.socketId
    }

    if(socketIdToEmitTo) {
        io.to(socketIdToEmitTo).emit('hangup');
    }
}


export default onHangup;