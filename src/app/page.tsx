import { Titan_One } from 'next/font/google';
import GameModeButton from './components/gamemodeButton';
import ThemeButton from './components/themeButton';
import TitleTagline from './components/titleTagline';

const titanOne = Titan_One({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-titan-one',
});

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center py-2 flex-1 mt-15">
      <ThemeButton/>
      <h1 className={`text-6xl mb-30 ${titanOne.className}`}>
        <span>Sightlines</span>
        <TitleTagline />
      </h1>
      <div className="flex flex-col items-center justify-center gap-20">
        <GameModeButton
          href = "/singleplayer"
          text = "Singleplayer"
        />
        <GameModeButton
          href = "/multiplayer"
          text = "Multiplayer"
        />
        <GameModeButton
          href = "/tutorial"
          text = "Tutorial"
          comingSoon = {true}
        />
      </div>
      
    </div>
  );
}
