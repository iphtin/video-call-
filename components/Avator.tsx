import Image from 'next/image';
import React from 'react'
import { FaUserCircle } from 'react-icons/fa'

const Avator = ({ src }: { src?: string }) => {
    if (src) {
        return (
            <Image src={src} alt='Avator' className='rounded-full'
                height={40}
                width={40} />
        )
    }
    return <FaUserCircle size={24} />
}

export default Avator;