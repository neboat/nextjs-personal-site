import type { MDXComponents } from 'mdx/types'
import { Code } from "@/components/codeblock"

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    pre: props => <Code {...props} />,
    wrapper: ({ children }) => <>{children}</>,
    ...components,
  }
}