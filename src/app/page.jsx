import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import Layout, { getLastModified } from "@/components/layout"
import * as styles from "@/components/index.module.css"
import Content from "./index-content.mdx"
import profilePic from "@/images/self_2015_nobkg.png"

export const metadata = {
  title: 'Home | Tao B. Schardl',
  description: 'Tao B. Schardl\'s personal website',
}

const links = [
  {
    text: "Code highlighter",
    url: "code-highlight",
    description:
      "Make high-quality syntax-highlighted code snippets for slides.",
  },
  {
    text: "Projects",
    url: "projects",
    description:
      "Find out more about current research and software projects.",
  },
  // {
  //   text: "Papers",
  //   url: "/papers",
  //   description:
  //     "Browse my academic bibliography.",
  // },
  {
    text: "Teaching",
    url: "teaching",
    description:
      "Get links to slides, handouts, and other course materials.",
  },
]

const moreLinks = [
  {
    text: "GitHub",
    url: "https://github.com/neboat"
  },
  {
    text: "Google Scholar",
    url: "https://scholar.google.com/citations?hl=en&user=XTakCM0AAAAJ",
  },
  {
    text: "CV",
    url: "/cv.pdf"
  }
]

const utmParameters = `` // `?utm_source=neboat-personal-site`

const IndexPage = () => {
  return (
    <Layout lastModified={getLastModified(`/src/app/papers/page.jsx`)}>
      <article className="prose prose-gray dark:prose-invert
        prose-code:before:hidden prose-code:after:hidden
        prose-inline-code:bg-amber-50 dark:prose-inline-code:bg-amber-950">
        <h1 className="flex-row items-baseline!">
          <Image
            height={128}
            width={128}
            style={{
              height: '128px',
              marginTop: '0',
              marginBottom: '0',
              display: 'inline-block',
              objectFit: 'cover',
              objectPosition: '50% 40%',
              verticalAlign: 'baseline',
            }}
            alt="Picture of Tao B. (TB) Schardl"
            src={profilePic}
          /> {` `} <span className="inline-block align-baseline!">Tao B. (TB) Schardl</span></h1>
        <Content />
        {moreLinks.map((link, i) => (
          <React.Fragment key={link.url}>
            <a
              href={`${link.url}${utmParameters}`}
              className={styles.listItemLink}>
              {link.text}
            </a>
            {i !== moreLinks.length - 1 && <> · </>}
          </React.Fragment>
        ))}
        <ul className={styles.list}>
          {links.map((link, i) => (
            <li key={link.url} className={styles.listItem}>
              <Link href={link.url}>{link.text}</Link>
              <p className={styles.listItemDescription}>{link.description}</p>
            </li>
          ))}
        </ul>
      </article>
    </Layout >
  )
}

export default IndexPage
