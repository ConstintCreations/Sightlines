import CustomLink from "@/app/components/customLink";

export default function Footer() {
    return (
        <footer className="w-full py-4 border-t border-gray-500 mt-8 flex flex justify-center items-center text-sm text-gray-500 mt-15">
            Created by 
            <CustomLink href="https://github.com/ConstintCreations" text="ConstintCreations" />
            | Inspired by 
            <CustomLink href="https://0hn0.com/" text="0h n0" />
            by 
            <CustomLink href="https://www.q42.nl/en" text="Q42" color="lime" />
        </footer>
    );
}