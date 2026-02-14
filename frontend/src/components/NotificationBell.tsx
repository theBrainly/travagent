import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { notificationService } from '../services/notificationService';
import { useAuth } from '../context/AuthContext';

interface NotificationBellProps {
    onNavigate: (page: string) => void;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ onNavigate }) => {
    const { agent } = useAuth(); // Changed user to agent based on other files
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!agent) return;

        const fetchCount = async () => {
            try {
                const { unreadCount } = await notificationService.getUnreadCount();
                setUnreadCount(unreadCount);
            } catch (error) {
                console.error('Failed to fetch notification count');
            }
        };

        fetchCount();
        const interval = setInterval(fetchCount, 60000);
        return () => clearInterval(interval);
    }, [agent]);

    return (
        <button
            onClick={() => onNavigate('notifications')}
            className="relative p-2 text-gray-400 hover:text-gray-500 transition-colors mr-2 focus:outline-none"
        >
            <Bell className="w-6 h-6" />
            {unreadCount > 0 && (
                <span className="absolute top-1 right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-red-100 transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full border-2 border-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                </span>
            )}
        </button>
    );
};

export default NotificationBell;
