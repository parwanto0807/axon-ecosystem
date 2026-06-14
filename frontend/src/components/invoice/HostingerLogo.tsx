import React from 'react';
import Image from 'next/image';
import hostingImg from './hosting.png';

export default function HostingerLogo({ className }: { className?: string }) {
    return (
        <Image 
            src={hostingImg} 
            alt="Hostinger" 
            className={className || "h-8 w-auto object-contain"} 
        />
    );
}
