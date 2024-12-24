import Layout, { getLastModified } from "@/components/layout"

export default async function MdxLayout({ children, params }: { children: React.ReactNode, params: Promise<{ slug: string }> }) {
    // read route params
    const slug = (await params).slug
    // Create any shared layout or styles here
    return (
        <Layout lastModified={getLastModified(`/src/app/(mdxPages)/${slug}.mdx`)}>
            {children}
        </Layout>
    )
}