'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import SearchBox from '@/components/search/search-box';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

export default function Navbar() {
  const [nav, setNav] = useState(false);

  const handleNav = () => {
    setNav(!nav);
  };

  const navItems = [
    { id: 1, text: 'LogIn' },
    { id: 2, text: 'SignUp', highlight: true },
  ];

  return (
    <div className="mx-auto flex h-24 items-center justify-between bg-black px-3 text-white">
      <h1 className="text-3xl font-bold text-blue-500">
        <Link href={''} className="hover:cursor-pointer">
          LOGO.
        </Link>
      </h1>
      <div className="hidden md:block">
        <SearchBox placeholder="Search events..." />
      </div>
      <ul className="hidden md:flex">
        {navItems.map((item) => (
          <li
            key={item.id}
            className={clsx(
              'm-2 cursor-pointer rounded-md px-4 py-2 duration-300 hover:bg-blue-500 hover:text-black',
              item.highlight && 'bg-blue-500',
            )}
          >
            <Link href={'#'}>{item.text}</Link>
          </li>
        ))}
      </ul>

      {/* Mobile Navigation Icon */}
      <div onClick={handleNav} className="block md:hidden">
        {nav ? (
          <XMarkIcon className="h-12 w-12 hover:cursor-pointer" />
        ) : (
          <Bars3Icon className="h-12 w-12 hover:cursor-pointer" />
        )}
      </div>

      {/* Mobile Navigation Menu */}
      <ul
        className={
          nav
            ? 'fixed left-0 top-0 z-50 h-full w-[60%] border-r border-r-gray-900 bg-[#000300] duration-500 ease-in-out md:hidden'
            : 'fixed bottom-0 left-[-100%] top-0 z-50 w-[60%] duration-500 ease-in-out'
        }
      >
        <h1 className="m-4 w-full text-3xl font-bold text-blue-500">
          <Link href={'#'} className="hover:cursor-pointer">
            LOGO.
          </Link>
        </h1>
        {navItems.map((item) => (
          <li
            key={item.id}
            className="cursor-pointer rounded-xl border-b border-gray-600 p-4 duration-300 hover:bg-blue-500 hover:text-black"
          >
            {item.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
