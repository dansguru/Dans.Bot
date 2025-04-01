import { ComponentProps, ReactNode } from 'react';
import { standalone_routes } from '@/components/shared';
import { useOauth2 } from '@/hooks/auth/useOauth2';
import useThemeSwitcher from '@/hooks/useThemeSwitcher';
import RootStore from '@/stores/root-store';
import {
    LegacyLogout1pxIcon,
    LegacyProfileSmIcon,
    LegacyTheme1pxIcon,
    LegacyWhatsappIcon,
    LegacyTelegramIcon,
} from '@deriv/quill-icons/Legacy';
import { useTranslations } from '@deriv-com/translations';
import { ToggleSwitch } from '@deriv-com/ui';

type TMenuConfigItem = {
    as: 'a' | 'button';
    href?: string;
    icon?: ReactNode;
    label: ComponentProps<'button'>['children'];
    LeftComponent?: any;
    onClick?: () => void;
    RightComponent?: ReactNode;
    target?: string;
    removeBorderBottom?: boolean;
};

const useMobileMenuConfig = (client?: RootStore['client']) => {
    const { localize } = useTranslations();
    const { is_dark_mode_on, toggleTheme } = useThemeSwitcher();
    const { oAuthLogout } = useOauth2();

    const getAccountUrl = (url: string) => {
        const urlParams = new URLSearchParams(window.location.search);
        const account_param = urlParams.get('account');
        const is_virtual = client?.is_virtual || account_param === 'demo' || false;

        const redirect_url = new URL(url);
        if (is_virtual) {
            redirect_url.searchParams.set('account', 'demo');
        } else if (client?.currency) {
            redirect_url.searchParams.set('account', client.currency);
        }

        return redirect_url.toString();
    };

    const menuConfig: TMenuConfigItem[][] = [
        [
            {
                as: 'a',
                href: getAccountUrl(standalone_routes.personal_details),
                label: localize('Account Settings'),
                LeftComponent: LegacyProfileSmIcon,
            },
            {
                as: 'button',
                label: localize('Dark theme'),
                LeftComponent: LegacyTheme1pxIcon,
                RightComponent: <ToggleSwitch value={is_dark_mode_on} onChange={toggleTheme} />,
            },
        ],
        [
            {
                as: 'a',
                href: 'https://wa.me/254791618769',
                label: localize('WhatsApp'),
                LeftComponent: LegacyWhatsappIcon,
                target: '_blank',
            },
            {
                as: 'a',
                href: 'https://t.me/ceo_sami',
                label: localize('Telegram'),
                LeftComponent: LegacyTelegramIcon,
                target: '_blank',
            },
        ],
        client?.is_logged_in
            ? [
                  {
                      as: 'button',
                      label: localize('Log out'),
                      LeftComponent: LegacyLogout1pxIcon,
                      onClick: oAuthLogout,
                      removeBorderBottom: true,
                  },
              ]
            : [],
    ];

    return {
        config: menuConfig,
    };
};

export default useMobileMenuConfig;
