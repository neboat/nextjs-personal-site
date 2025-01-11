import type { MDXComponents } from 'mdx/types'
import { Code } from "@/components/codeblock"
import { AnchoredHeader } from './components/anchored-header'

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h2: props => <AnchoredHeader level={2} {...props} />,
    h3: props => <AnchoredHeader level={3} {...props} />,
    pre: props => <Code {...props} />,
    wrapper: ({ children }) => <>{children}</>,
    ...components,
  }
}