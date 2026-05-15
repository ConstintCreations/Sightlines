import GridSizeButton from '@/app/components/gridSizeButton';
import BackArrow from '@/app/components/backArrow';
import ScoreDisplay from '@/app/components/scoreDisplay';

export default function Multiplayer() {
    return (
        <div className="flex flex-col items-center justify-center py-2 flex-1 mt-15">
            <BackArrow />
            <h1 className={`text-6xl mb-10 font-bold`}>
                Multiplayer
            </h1>
            <h2 className="text-3xl mb-20 text-[var(--alt-text)]">
                Select a size to queue...
            </h2>
            <div className="flex flex-col items-center justify-center gap-3">
                <div className="flex flex-row items-center justify-center gap-3">
                    <GridSizeButton size={4} singleplayer={false} />
                    <GridSizeButton size={5} singleplayer={false} />
                    <GridSizeButton size={6} singleplayer={false} />
                </div>
                <div className="flex flex-row items-center justify-center gap-3">
                    <GridSizeButton size={7} singleplayer={false} />
                    <GridSizeButton size={8} singleplayer={false} />
                    <GridSizeButton size={9} singleplayer={false} />
                </div>
                <GridSizeButton size={"any"} singleplayer={false} />
            </div>

            <ScoreDisplay singleplayer={false} />
            <p className="text-[var(--alt-text)] mt-10 text-center">
                * Currently, some grids may have multiple solutions. <br />
                You only need to find 1.
            </p>
        </div>
    );
}