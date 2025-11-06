import GridSizeButton from '@/app/components/gridSizeButton';
import BackArrow from '@/app/components/backArrow';

export default function Singleplayer() {
    return (
        <div className="flex flex-col items-center justify-center py-2 flex-1 mt-15">
            <BackArrow />
            <h1 className={`text-6xl mb-10 font-bold`}>
                Singleplayer
            </h1>
            <h2 className="text-3xl mb-30 text-gray-500">
                Select a size to play...
            </h2>
            <div className="flex flex-col items-center justify-center gap-3">
                <div className="flex flex-row items-center justify-center gap-3">
                    <GridSizeButton size={4} singleplayer={true} />
                    <GridSizeButton size={5} singleplayer={true} />
                    <GridSizeButton size={6} singleplayer={true} />
                </div>
                <div className="flex flex-row items-center justify-center gap-3">
                    <GridSizeButton size={7} singleplayer={true} />
                    <GridSizeButton size={8} singleplayer={true} />
                    <GridSizeButton size={9} singleplayer={true} />
                </div>
            </div>

            <p className="mt-40 text-gray-500 text-4xl font-bold">
                0
            </p>
            
    </div>
    );
}