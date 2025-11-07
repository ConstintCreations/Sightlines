"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { usePathname } from "next/navigation";

export default function BackArrow(data: { href?: string;}) {
    const pathname = usePathname();
    return (
        <motion.a
            href={data.href ? data.href : pathname.split("/").length <= 2 ? "/" : `/${pathname.split("/")[1]}`}
            className="text-3xl text-gray-400 hover:text-gray-200 hover:cursor-pointer fixed top-10 left-10 focus:outline-none"
            whileHover= {{scale: 1.1, x:-5, color: "var(--color-gray-200)"}}
            whileFocus= {{scale: 1.1, x:-5, color: "var(--color-gray-200)"}}
            whileTap={{x: -10, scale: 1.2}}
            transition={{ type: "spring", stiffness: 300 }}
        >
            <FontAwesomeIcon icon={faArrowLeft} />
        </motion.a>            
    )
}