"use client";

import React from "react";
import { FaMessage, FaPhone } from "react-icons/fa6";
import { Button } from "./ui/button";
import Link from "next/link";

export function Footer() {
  return (
    <div className="text-xs w-full opacity-50 flex flex-row justify-between items-center px-15 py-5">
      <p>GitRats © {new Date().getFullYear()}. Todos os direitos reservados.</p>

      <div className="flex flex-row items-center gap-5">
        <Link
          href="https://www.linkedin.com/in/yurirxmos/"
          className="text-xs hover:underline"
        >
          /linkedin
        </Link>
        <Link
          href="https://yuri.rxmos.dev.br/"
          className="text-xs hover:underline"
        >
          /portfolio
        </Link>
        <Link
          href="https://x.com/rxmosdev"
          className="text-xs hover:underline"
        >
          /contato
        </Link>
      </div>
    </div>
  );
}
