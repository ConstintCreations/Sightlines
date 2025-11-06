import BackArrow from "@/app/components/backArrow";
import SingleplayerGrid from "@/app/components/singleplayerGrid";

export default function Game() {
    return (
        <div className="flex flex-col items-center justify-center flex-1 mt-15">
            <BackArrow />
            <SingleplayerGrid />
        </div>
    );
}