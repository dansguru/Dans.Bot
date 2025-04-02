import useRemoteConfig from '@/hooks/growthbook/useRemoteConfig';
import useModalManager from '@/hooks/useModalManager';
import { getActiveTabUrl } from '@/utils/getActiveTabUrl';
import { LANGUAGES } from '@/utils/languages';
import { useTranslations } from '@deriv-com/translations';
import { DesktopLanguagesModal, useDevice } from '@deriv-com/ui';
import Livechat from '../../chat/Livechat';
import AccountLimits from './AccountLimits';
import ChangeTheme from './ChangeTheme';
import Deriv from './Deriv';
import Endpoint from './Endpoint';
import FullScreen from './FullScreen';
import HelpCentre from './HelpCentre';
import LanguageSettings from './LanguageSettings';
import NetworkStatus from './NetworkStatus';
import ResponsibleTrading from './ResponsibleTrading';
import ServerTime from './ServerTime';
import WhatsApp from './WhatsApp';
import './footer.scss';

const Footer = () => {
    const { currentLang = 'EN', localize, switchLanguage } = useTranslations();
    const { hideModal, isModalOpenFor, showModal } = useModalManager();
    const { isDesktop } = useDevice();

    const openLanguageSettingModal = () => showModal('DesktopLanguagesModal');

    const { data } = useRemoteConfig(true);
    const { cs_chat_whatsapp } = data;

    return (
        <footer className='app-footer'>
            <FullScreen />
            <LanguageSettings openLanguageSettingModal={openLanguageSettingModal} />
        
            <div className='app-footer__vertical-line' />
            <ChangeTheme />
           
            {cs_chat_whatsapp && <WhatsApp />}
            <div className='app-footer__vertical-line' />
            <ServerTime />
            <div className='app-footer__vertical-line' />
            <NetworkStatus />
            <Endpoint />
            {isDesktop && (
                <div className='app-footer__sliding-text-container'>
                    <div className='app-footer__sliding-text'>
                        <span>Welcome to TradersHall - Your Ultimate Trading Companion</span>
                        <span>•</span>
                        <span>Join our Telegram community for exclusive trading strategies</span>
                        <span>•</span>
                        <span>Experience the power of automated trading with our advanced bots</span>
                        <span>•</span>
                        <span>24/7 Support Available - We're here to help you succeed</span>
                    </div>
                </div>
            )}

            {isModalOpenFor('DesktopLanguagesModal') && (
                <DesktopLanguagesModal
                    headerTitle={localize('Select Language')}
                    isModalOpen
                    languages={LANGUAGES}
                    onClose={hideModal}
                    onLanguageSwitch={code => {
                        switchLanguage(code);
                        hideModal();
                        window.location.replace(getActiveTabUrl());
                        window.location.reload();
                    }}
                    selectedLanguage={currentLang}
                />
            )}
        </footer>
    );
};

export default Footer;
