import { io } from '../server.js';

const onWebrtcSignal = async (data) => {
    if (data.isCaller) {
        if (data.ongoingCall.partcipants.receiver.socketId) {
            io.to(data.ongoingCall.partcipants.receiver.socketId).emit(
                'webrtcSignal', data
            )
        }
    } else {
        if (data.ongoingCall.partcipants.caller.socketId) {
            io.to(data.ongoingCall.partcipants.caller.socketId).emit(
                'webrtcSignal', data
            )
        }
    }
};

export default onWebrtcSignal;