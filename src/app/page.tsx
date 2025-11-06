import { Titan_One } from 'next/font/google';
import GameModeButton from './components/gamemodeButton';

const titanOne = Titan_One({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-titan-one',
});

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center py-2 flex-1 mt-15">
      <h1 className={`text-6xl mb-40 ${titanOne.className}`}>
          Sightlines
        </h1>
      <div className="flex flex-col items-center justify-center gap-25">
        
        <GameModeButton
          href = "/singleplayer"
          text = "Singleplayer"
        />
        <GameModeButton
          href = "/multiplayer"
          text = "Multiplayer"
        />
      </div>
      
    </div>
  );
}
