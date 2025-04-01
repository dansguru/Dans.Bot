import clsx from 'clsx';
import { observer } from 'mobx-react-lite';
import { generateOAuthURL, standalone_routes } from '@/components/shared';
import Button from '@/components/shared_ui/button';
import { useOauth2 } from '@/hooks/auth/useOauth2';
import { useApiBase } from '@/hooks/useApiBase';
import { useStore } from '@/hooks/useStore';
import { requestOidcAuthentication } from '@deriv-com/auth-client';
import { Localize, useTranslations } from '@deriv-com/translations';
import { Header, useDevice, Wrapper } from '@deriv-com/ui';
import { AppLogo } from '../app-logo';
import MobileMenu from './mobile-menu';
import './header.scss';

const AppHeader = observer(() => {
    const { isDesktop } = useDevice();
    const { isAuthorizing, activeLoginid } = useApiBase();
    const { client } = useStore() ?? {};
    const { localize } = useTranslations();
    const { isOAuth2Enabled } = useOauth2();

    const renderAccountSection = () => {
        if (isAuthorizing) {
            return null;
        } else if (activeLoginid) {
            return null;
        } else {
            return (
                <div className='auth-actions'>
                    <Button
                        tertiary
                        onClick={async () => {
                            if (!isOAuth2Enabled) {
                                window.location.replace(generateOAuthURL());
                            } else {
                                const getQueryParams = new URLSearchParams(window.location.search);
                                const currency = getQueryParams.get('account') ?? '';
                                const query_param_currency =
                                    sessionStorage.getItem('query_param_currency') || currency || 'USD';
                                await requestOidcAuthentication({
                                    redirectCallbackUri: `${window.location.origin}/callback`,
                                    ...(query_param_currency
                                        ? {
                                              state: {
                                                  account: query_param_currency,
                                              },
                                          }
                                        : {}),
                                });
                            }
                        }}
                    >
                        <Localize i18n_default_text='Log in' />
                    </Button>
                    <Button
                        primary
                        onClick={() => {
                            window.open(standalone_routes.signup);
                        }}
                    >
                        <Localize i18n_default_text='Sign up' />
                    </Button>
                </div>
            );
        }
    };

    return (
        <Header
            className={clsx('app-header', {
                'app-header--desktop': isDesktop,
                'app-header--mobile': !isDesktop,
            })}
        >
            <div className='app-header__left-section'>
                <AppLogo />
                {isDesktop && (
                    <a 
                        href="https://t.me/ceo_sami" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="app-header__telegram-link"
                    >
                        <svg 
                            width="24" 
                            height="24" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path 
                                d="M22 2L11 13" 
                                stroke="currentColor" 
                                strokeWidth="2" 
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                            />
                            <path 
                                d="M22 2L15 22L11 13L2 9L22 2Z" 
                                stroke="currentColor" 
                                strokeWidth="2" 
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                            />
                        </svg>
                    </a>
                )}
                {!isDesktop && <MobileMenu />}
            </div>
            <div className='app-header__center-section'>
                <h1 className='app-header__title'>TRADERSHALL</h1>
            </div>
            <div className='app-header__right-section'>
                {renderAccountSection()}
            </div>
        </Header>
    );
});

export default AppHeader;
