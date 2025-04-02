import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import '../loader/futuristic-dots.scss';

const BlocklyLoading = observer(() => {
    const { blockly_store } = useStore();
    const { is_loading } = blockly_store;

    return (
        <>
            {is_loading && (
                <div className='bot__loading' data-testid='blockly-loader'>
                    <div className="futuristic-dots-container">
                        <div className="futuristic-dot"></div>
                        <div className="futuristic-dot"></div>
                        <div className="futuristic-dot"></div>
                        <div className="futuristic-dot"></div>
                        <div className="futuristic-dot"></div>
                    </div>
                    <div className="load-message">Loading TraderShall...</div>
                </div>
            )}
        </>
    );
});

export default BlocklyLoading;
