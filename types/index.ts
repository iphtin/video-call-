import { User } from "@clerk/nextjs/server";
import Peer from 'simple-peer';

export type SocketUser = {
    userId: string;
    socketId: string;
    profile: User;
}

export type OngoingCall = {
  partcipants: Partcipants;
  isRinging: boolean;
}

export type Partcipants = {
  caller: SocketUser;
  receiver: SocketUser;
}

export type PeerData = {
  peerConnection: Peer.Instance;
  stream: MediaStream | undefined;
  participantUser: SocketUser;
}