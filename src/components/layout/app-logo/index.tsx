import { standalone_routes } from '@/components/shared';
import { useDevice } from '@deriv-com/ui';
import './app-logo.scss';

export const AppLogo = () => {
    const { isDesktop } = useDevice();

    if (!isDesktop) return null;
    return (
        <a href={standalone_routes.deriv_com} target='_blank' className='app-header__logo'>
            <img src="/traderlogo.jpeg" alt="Traders Hub" className='app-header__logo-image' />
        </a>
    );
};
