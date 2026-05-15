import BackArrow from "@/app/components/backArrow";
import TutorialSlideshow from "@/app/components/tutorialSlideshow";

export default function Tutorial() {
    return (
        <div className="flex flex-col items-center justify-center flex-1">
            <BackArrow></BackArrow>
            <TutorialSlideshow></TutorialSlideshow>
        </div>
    );
}