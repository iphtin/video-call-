"use client";

import { OngoingCall, Partcipants, PeerData, SocketUser } from "@/types";
import { useUser } from "@clerk/nextjs";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import Peer, {SignalData} from "simple-peer";

interface iSocketContext {
  onlineUsers: SocketUser[] | null
  handleCall: (user: SocketUser) => void,
  ongoingCall: OngoingCall | null,
  localStream: MediaStream | null,
  handleJoinCall: (ongoingCall: OngoingCall) => void,
  peer: PeerData | null,
  handleHangup: (data: {ongoingCall?: OngoingCall, isEmitHandup?: boolean}) => void,
  isCallEnded: boolean
}

export const SocketContext = createContext<iSocketContext | null>(null)

export const SocketContextProvider = ({ children }: { children: React.ReactNode }) => {
    const { user } = useUser();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isSocketConnected, setIsSocketConnected] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<SocketUser[] | null>(null);
    const [ongoingCall, setOngoingCall] = useState<OngoingCall | null>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [peer, setPeer] = useState<PeerData | null>(null);
    const [isCallEnded, setIsCallEnded] = useState(false);

    console.log("Peer", peer);

    const curreSocketUser = onlineUsers?.find(onlineUser => onlineUser.userId === user?.id);

    const getMediaStream = useCallback(async (faceMode?: string) => {

        if(localStream) {
            return localStream;
        }

        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: {
                    width: {min: 640, ideal: 1280, max: 1920},
                    height: {min: 360, ideal: 720, max: 1080},
                    frameRate: {min: 16, ideal: 30, max: 30},
                    facingMode: videoDevices.length > 0 ? faceMode : undefined
                }
            });
            setLocalStream(stream);
            return stream;
        } catch (error) {
            console.log("Failed to get the stream", error);
            setLocalStream(null);
            return null;
        }

    }, [localStream]);

    const handleCall = useCallback( async (user: SocketUser) => {
        setIsCallEnded(false);
        if(!curreSocketUser || !socket) return;

        const stream = await getMediaStream();

        if(!stream) {
            console.log("No Stream in Handle Call");
            return;
        }
        
        const partcipants = { caller: curreSocketUser, receiver: user}

        setOngoingCall({
            partcipants,
            isRinging: false
        });

        socket.emit('call', partcipants)

    }, [socket, curreSocketUser, ongoingCall]);

    const onIncomingCall = useCallback((partcipants: Partcipants) => {
        setOngoingCall(
           { partcipants,
            isRinging: true}
        )
    }, [socket, user, ongoingCall]);

    console.log('isSocketConnected ', isSocketConnected);

    const handleHangup = useCallback((data: { ongoingCall?: OngoingCall | null, isEmitHandup?: boolean}) => {
        console.log("DataFromHangUp", data);
        if(socket && user && data?.ongoingCall && data?.isEmitHandup) {
            socket.emit('hangup', {
                ongoingCall: data.ongoingCall,
                userHangupId: user.id
            });
        }

        setOngoingCall(null);
        setPeer(null);

        if(localStream) {
            localStream.getTracks().forEach((track) => track.stop());
            setLocalStream(null);
        }

        setIsCallEnded(true)
    }, [socket,  user, localStream]);

    const createPeer = useCallback((stream: MediaStream, initiator: boolean)=> {
        const iceServers:RTCIceServer[] = [
            {
                urls: [
                    "stun:sturn.l.google.com:19302",
                    "stun:sturn1.l.google.com:19302",
                    "stun:sturn2.l.google.com:19302",
                    "stun:sturn3.l.google.com:19302",
                ]
            }
        ]

        const peer = new Peer({
            stream,
            initiator,
            trickle: true,
            config: {iceServers}
        });

        peer.on('stream', (stream) => {
             setPeer((prevPeer) => {
                if(prevPeer) {
                    return {...prevPeer, stream};
                }
                return prevPeer;
             })
        });

        peer.on('error', console.error)
        peer.on('close', () => handleHangup)

        const rtcPeerConnection:RTCPeerConnection = (peer as any)._pc

        rtcPeerConnection.oniceconnectionstatechange = () => {
            if(rtcPeerConnection.iceConnectionState === 'disconnected' || rtcPeerConnection.iceConnectionState === 'failed') {
                handleHangup({});
            }
        }

        return peer;

    }, [ongoingCall, setPeer]);

    const completePeerConnection = useCallback(async (connectionData: {sdp: SignalData, ongoingCall: OngoingCall, isCaller: boolean}) => {
        if(!localStream) {
            console.log("Missing the localStream");
            return;
        }

        if(peer) {
            peer.peerConnection?.signal(connectionData.sdp);
            return;
        }

        const newPeer = createPeer(localStream, true);

        setPeer({
            peerConnection: newPeer,
            participantUser: connectionData.ongoingCall.partcipants.receiver,
            stream: undefined
        });

        newPeer.on('signal', async (data:SignalData) => {
            if(socket) {
                // emit offer

                socket.emit('webrtcSignal', {
                    sdp: data,
                    ongoingCall,
                    isCaller: true
                })
            }
        })

    }, [localStream, createPeer, peer, ongoingCall])

    const handleJoinCall = useCallback(async (ongoingCall: OngoingCall) => {
        setIsCallEnded(false);
        // joining call
        setOngoingCall(prev => {
            if(prev) {
                return {...prev, isRinging: false}
            }
            return prev;
        });

        const stream = await getMediaStream();

        if(!stream){
            console.log("Could not get Stream in handle join call");
            handleHangup({ongoingCall: ongoingCall ? ongoingCall : undefined, isEmitHandup: true});
            return;
        }

        const newPeer = createPeer(stream, true);

        setPeer({
            peerConnection: newPeer,
            participantUser: ongoingCall.partcipants.caller,
            stream: undefined
        });

        newPeer.on('signal', async (data:SignalData) => {
            if(socket) {
                // emit offer

                socket.emit('webrtcSignal', {
                    sdp: data,
                    ongoingCall,
                    isCaller: false
                })
            }
        })
    }, [socket, curreSocketUser]);

    useEffect(() => {
        const newSocket = io();
        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        }
    }, [user]);

    useEffect(() => {

        if (socket === null) return;

        if (socket.connected) {
            onConnect()
        }

        function onConnect() {
            setIsSocketConnected(true);
        }

        function onDisConnect() {
            setIsSocketConnected(false);
        }

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisConnect);

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisConnect);
        }
    }, [socket]);

    // set online users
    useEffect(() => {
        if (!socket || isSocketConnected) return;

        socket.emit('addNewUser', user);
        socket.on('getUsers', (res) => {
            setOnlineUsers(res)
        });

        return () => {
            socket.off('getUsers', (res) => {
                setOnlineUsers(res)
            })
        }

    }, [socket, isSocketConnected, user]);

    useEffect(() => {
        if(!socket || !isSocketConnected) return;
        socket.on('incomingCall', onIncomingCall);
        socket.on('webrtcSignal', completePeerConnection);
        socket.on('hangup', handleHangup);

        return () => {
            socket.off('incomingCall', onIncomingCall);
            socket.off('webrtcSignal', completePeerConnection);
            socket.off('hangup', handleHangup);
        }
    }, [socket, isSocketConnected, user, onIncomingCall, completePeerConnection]);

    useEffect(() => {
        let timeout:ReturnType<typeof setTimeout>

        if(isCallEnded) {
            timeout = setTimeout(() => {
              setIsCallEnded(false);
            }, 2000);
        }

        return () => clearTimeout(timeout);
    }, [isCallEnded])

    return <SocketContext.Provider value={{
        onlineUsers,
        handleCall,
        ongoingCall,
        localStream,
        handleJoinCall,
        peer,
        handleHangup,
        isCallEnded
    }}>
        {children}
    </SocketContext.Provider>
}

export const useSocket = () => {
    const context = useContext(SocketContext);

    if (context === null) {
        throw new Error("useSocket must be within a SocketContextProvider");
    }

    return context;
}