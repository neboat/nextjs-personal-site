'use client'

import * as React from "react"
import Link from "next/link"
import { usePathname } from 'next/navigation'

const NavLink = ({ children, url, currentPath, ...props }: { children: React.ReactNode, url: string, currentPath: string }) => (
  <Link href={url}
    {...props}
    className={currentPath === url
      ? 'inline-block py-2 px-3 border-b-2 border-b-rose-700 dark:border-b-rose-500 hover:border-b-rose-700 hover:dark:border-b-rose-500'
      : 'inline-block py-2 px-3 border-b-2 border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 hover:dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700'
    }
  >{children}</Link>
)

const isBrowser = () => typeof window !== "undefined"

/**
 * Get the default light/dark theme.
 */
function getDefaultTheme() {
  // First try to use the theme in local storage.
  const savedTheme = isBrowser() && window.localStorage.getItem("theme")
  if (savedTheme) {
    return savedTheme
  }
  // Otherwise, use the system preference.
  if (isBrowser() && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return "dark"
  }
  return "light"
}

export const Header = () => {
  const [isDark, setIsDark] = React.useState(getDefaultTheme())
  React.useEffect(() => {
    document.documentElement.classList.toggle(
      'dark', isDark === 'dark'
    )
    if (isBrowser()) {
      window.localStorage.setItem("theme", isDark)
    }
  }, [isDark])

  const navLinks = [
    ['Home', '/'],
    ['Projects', '/projects'],
    ['Code Highlighter', '/code-highlight'],
    ['Teaching', '/teaching'],
    ['Papers', '/papers'],
    ['Bio', '/bio'],
    ['Contact', '/contact']
  ]
  const currentPath = usePathname()
  return (
    <header className="flex items-center border-b border-b-neutral-400 dark:border-b-neutral-600 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-semibold">
      <nav className="hidden md:flex mb-0">
        {navLinks.map(([title, url]) =>
          <NavLink url={url} currentPath={currentPath} key={title}>{title}</NavLink>
        )}
      </nav>

      <div className="group flex flex-col" id="mobile-menu">
        <input className="hidden peer" type="checkbox" name="menu-button" id="menu-button" />
        <label className="block relative py-2 md:hidden ml-3" htmlFor="menu-button">
          <div className="py-2 mt-1 mb-1" aria-label="Menu">
            <span className="block relative w-5 h-0.5 bg-zinc-600 dark:bg-zinc-300 group-has-[:checked]:bg-transparent
        before:bg-zinc-600 dark:before:bg-zinc-300 before:content-[''] before:block before:absolute before:w-full before:h-full before:top-1.5 group-has-[:checked]:before:-rotate-45 group-has-[:checked]:before:top-0
        after:bg-zinc-600 dark:after:bg-zinc-300 after:content-[''] after:block after:absolute after:w-full after:h-full after:-top-1.5 group-has-[:checked]:after:rotate-45 group-has-[:checked]:after:top-0"></span>
          </div>
        </label>
        <nav className="md:hidden max-h-0 overflow-hidden peer-checked:max-h-full" style={{ transition: "max-height .2s ease-out" }}>
          <ul className="mb-0">
            {navLinks.map(([title, url]) => (
              <li className="block" key={title}><NavLink url={url} currentPath={currentPath}>{title}</NavLink></li>
            ))}
          </ul>
        </nav>
      </div>
      <button className="ml-auto mr-3 self-start py-2 border-b-2 border-b-transparent" onClick={() => setIsDark(isDark === "dark" ? "light" : "dark")}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="hidden dark:block size-6 text-zinc-300" aria-label="Toggle dark mode">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
        </svg>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="block dark:hidden size-6 text-zinc-600" aria-label="Toggle light mode">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
        </svg>
      </button>
    </header>
  )
}
