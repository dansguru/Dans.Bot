import FuturisticDotsLoader from './futuristic-dots';

export default function ChunkLoader({ message }: { message: string }) {
    return (
        <div className='app-root'>
            <FuturisticDotsLoader />
            <div className='load-message'>{message}</div>
        </div>
    );
}
