import * as React from "react"
import type { Metadata, ResolvingMetadata } from 'next'

export default async function MdxPage({
    params,
}: {
    params: Promise<{ slug: string }>
}) {
    // read route params
    const slug = (await params).slug
    // fetch page content
    const { default: Content } = await import(`../${slug}.mdx`)
    return <Content />
}

type Props = {
    params: Promise<{ slug: string }>
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata(
    { params, searchParams }: Props,
    parent: ResolvingMetadata
): Promise<Metadata> {
    // read route params
    const slug = (await params).slug
    // fetch page metadata
    const { metadata } = await import(`../${slug}.mdx`)

    return {
        title: metadata.title,
        description: metadata.description,
    }
}

export function generateStaticParams() {
    return [{ slug: 'projects' }, { slug: 'teaching' }, { slug: 'bio' }, { slug: 'contact' }]
}

export const dynamicParams = false
