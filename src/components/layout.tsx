import * as React from "react"
import { promises as fs } from "fs"
import "./layout.css"

async function formatDate(datePromise: Promise<Date>) {
  const date = (await datePromise)
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();

  return `${month}/${day}/${year}`;
}

export const getLastModified = async (filepath: string) => {
  return (await fs.stat(process.cwd() + filepath)).mtime
}

const defaultMainClassName = "flex flex-col min-h-screen items-center"

const Layout = (
  { children, lastModified, mainClassName = defaultMainClassName, articleClassName = '' }
    : { children: React.ReactNode, lastModified: Promise<Date>, mainClassName?: string, articleClassName?: string }) => {
  return (
    <div
      style={{
        padding: `var(--size-gutter)`,
      }}
      className="dark:bg-zinc-900"
    >
      <main className={mainClassName}>
        <article className={"prose prose-zinc dark:prose-invert prose-code:before:hidden prose-code:after:hidden prose-inline-code:bg-amber-50 dark:prose-inline-code:bg-amber-950 " + articleClassName}>
          {children}
        </article>
      </main>
      <footer
        style={{
          marginTop: `var(--space-5)`,
          fontSize: `var(--font-sm)`,
        }}
        className="text-zinc-500"
      >
        © {new Date().getFullYear()} Tao B. Schardl
        {` `}
        &middot; Last modified {formatDate(lastModified)}
        {` `}
        &middot; <a href="http://accessibility.mit.edu/">Accessibility</a>
      </footer>
    </div>
  )
}

export default Layout
