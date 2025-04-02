import { localize } from '@deriv-com/translations';
import '../loader/futuristic-dots.scss';

const SSOLoader = () => {
    return (
        <div className='sso-loader'>
            <div className='sso-loader__content'>
                <div className="futuristic-dots-container">
                    <div className="futuristic-dot"></div>
                    <div className="futuristic-dot"></div>
                    <div className="futuristic-dot"></div>
                    <div className="futuristic-dot"></div>
                    <div className="futuristic-dot"></div>
                </div>
                <h3 className='sso-loader__title'>{localize('Getting your account ready')}</h3>
            </div>
        </div>
    );
};

export default SSOLoader;
