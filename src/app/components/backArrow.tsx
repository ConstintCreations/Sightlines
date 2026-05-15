"use client";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { usePathname } from "next/navigation";

export default function BackArrow(data: { href?: string;}) {
    const pathname = usePathname();
    const safePath = pathname ? pathname : "/";
    return (
        <motion.a
            href={data.href ? data.href : safePath.split("/").length <= 2 ? "/" : `/${safePath.split("/")[1]}`}
            className="text-3xl text-[var(--unfocused-text)] hover:text-[var(--focused-text)] hover:cursor-pointer fixed top-10 left-10 focus:outline-none focus-visible:text-[var(--focused-text)] transition-colors duration-300"
            whileHover= {{scale: 1.1, x:-5}}
            whileFocus= {{scale: 1.1, x:-5}}
            whileTap={{x: -10, scale: 1.2}}
            transition={{ type: "spring", stiffness: 300 }}
        >
            <FontAwesomeIcon icon={faArrowLeft} />
        </motion.a>            
    )
}