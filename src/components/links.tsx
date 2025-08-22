import * as React from "react"
import InternalLink from "next/link"
import type { Route } from "next"

const utmParameters = `` // `?utm_source=neboat-personal-site`

// Since DOM elements <a> cannot receive activeClassName
// and partiallyActive, destructure the prop here and
// pass it only to InternalLink
const Link = ({ children, href, ...other }: { children: React.ReactNode, href: string }) => {
    // Tailor the following test to your environment.
    // This example assumes that any internal link
    // will start with exactly one slash, and that anything else is external.
    const internal = /^\/(?!\/)/.test(href)

    // Use Link from next/link for internal links, and <a> for others
    if (internal) {
        return (
            <InternalLink
                href={href as Route}
                {...other}
            >
                {children}
            </InternalLink>
        )
    }
    return (
        <a href={`${href}${utmParameters}`} {...other}>
            {children}
        </a>
    )
}

export const LinkList = ({ links, ...props }: { links: [{ url: string, text: string }] }) => {
    return <React.Fragment>
        {links.map((link, i) => (
            <React.Fragment key={link.url}>
                <Link href={link.url} {...props}>{link.text}</Link>
                {i !== links.length - 1 && <> · </>}
            </React.Fragment>
        ))}
    </React.Fragment>
}
