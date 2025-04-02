import { standalone_routes } from '@/components/shared';
import { useDevice } from '@deriv-com/ui';
import './app-logo.scss';

export const AppLogo = () => {
    const { isDesktop } = useDevice();

    if (!isDesktop) return null;
    return (
        <a href={standalone_routes.deriv_com} target='_blank' className='app-header__logo'>
            <svg 
                className="tradershall-logo" 
                viewBox="0 0 240 40" 
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#00ccff" />
                        <stop offset="50%" stopColor="#ffffff" />
                        <stop offset="100%" stopColor="#0066ff" />
                    </linearGradient>
                </defs>
                <text 
                    x="10" 
                    y="30" 
                    fontFamily="Arial, sans-serif" 
                    fontWeight="bold" 
                    fontSize="24"
                    fill="url(#logo-gradient)"
                    className="logo-text"
                >
                    TRADERSHALL
                </text>
            </svg>
        </a>
    );
};
