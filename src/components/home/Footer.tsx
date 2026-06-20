import Link from "next/link";
import { motion } from "motion/react";

function TelegramIcon() {
  return (
    <motion.svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    >
      <path d="M21.5 2.5L2.5 10.5L10.5 13.5L13.5 21.5L21.5 2.5Z" />
      <line x1="10.5" y1="13.5" x2="16.5" y2="7.5" />
    </motion.svg>
  );
}

export function Footer() {
    return (
        <footer className="w-full bg-panel mt-12 py-10 text-sm">
            <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
                <div>
                    <h4 className="mb-2 font-semibold text-white">Pricing</h4>
                    <ul>
                        <li><Link href="#" className="hover:text-primary">Free plan</Link></li>
                        <li><Link href="#" className="hover:text-primary">VIP plans</Link></li>
                    </ul>
                </div>
                <div>
                    <h4 className="mb-2 font-semibold text-white">FAQS</h4>
                    <ul>
                        <li><Link href="#" className="hover:text-primary">About dashboard</Link></li>
                        <li><Link href="#" className="hover:text-primary">Payment</Link></li>
                    </ul>
                </div>
                <div>
                    <h4 className="mb-2 font-semibold text-white">Contacts</h4>
                    <ul className="flex flex-col gap-1">
                        <li>
                            <Link href="https://t.me/braziv" className="flex items-center gap-2 hover:text-primary">
                                <TelegramIcon /> Telegram
                            </Link>
                        </li>
                    </ul>
                </div>
            </div>
            <div className="mt-10 text-center text-muted">
                EL7Stresser - IP Stresser and Booter.<br />All rights reserved © 2024
            </div>
        </footer>
    )
}
