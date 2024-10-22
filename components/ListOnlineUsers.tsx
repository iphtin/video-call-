"use client";

import { useSocket } from '@/context/SocketContext'
import { useUser } from '@clerk/nextjs';
import React from 'react'
import Avator from './Avator';

const ListOnlineUsers = () => {
    const { user } = useUser();
    const { onlineUsers, handleCall } = useSocket();
    return (
        <div className='flex w-full border-b border-b-primary/10 gap-x-4 items-center pb-2'>
            {onlineUsers && onlineUsers.map(onlineUser => {
                if(onlineUser.profile.id === user?.id) return null;
                return (
                    <div onClick={() => handleCall(onlineUser)} key={onlineUser.userId} className='flex flex-col items-center gap-1 cursor-pointer'>
                        <Avator src={onlineUser.profile.imageUrl} />
                        <div className='text-sm'>{onlineUser.profile.fullName === null ? "BagWell" : onlineUser.profile.fullName?.split(' ')[0]}</div>
                     </div>
                )
            })}
        </div>
    )
}

export default ListOnlineUsers;