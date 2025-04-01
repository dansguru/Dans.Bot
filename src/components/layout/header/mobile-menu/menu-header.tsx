import { ComponentProps, useMemo } from 'react';
import { LANGUAGES } from '@/utils/languages';
import { useTranslations } from '@deriv-com/translations';
import { Text, useDevice } from '@deriv-com/ui';

type TMenuHeader = {
    hideLanguageSetting: boolean;
    openLanguageSetting: ComponentProps<'button'>['onClick'];
};

const MenuHeader = ({ hideLanguageSetting, openLanguageSetting }: TMenuHeader) => {
    const { currentLang, localize } = useTranslations();
    const { isDesktop } = useDevice();

    const countryIcon = useMemo(
        () => LANGUAGES.find(({ code }) => code === currentLang)?.placeholderIconInMobile,
        [currentLang]
    );

    return (
        <div className='mobile-menu__header'>
            <Text 
                size={isDesktop ? 'md' : 'lg'} 
                weight='bold'
                style={{
                    background: 'linear-gradient(45deg, #FF6B6B, #4ECDC4)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    textAlign: 'center',
                    width: '100%',
                    padding: '4px 0',
                    letterSpacing: '0.3px',
                    textTransform: 'uppercase',
                    marginBottom: '4px',
                }}
            >
                TRADERSHALL
            </Text>

            {!hideLanguageSetting && (
                <button className='mobile-menu__header__language items-center' onClick={openLanguageSetting}>
                    {countryIcon}
                    <Text className='ml-[0.4rem]' size={isDesktop ? 'xs' : 'sm'} weight='bold'>
                        {currentLang}
                    </Text>
                </button>
            )}
        </div>
    );
};

export default MenuHeader;
