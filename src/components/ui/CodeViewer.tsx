import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/vs2015.css';

interface CodeViewerProps {
  code: string;
  language?: string;
}

export const CodeViewer = ({ code, language = 'python' }: CodeViewerProps) => {
  const markdownCode = `\`\`\`${language}\n${code}\n\`\`\``;

  return (
    <div className="prose prose-invert max-w-none">
      <ReactMarkdown
        rehypePlugins={[rehypeHighlight]}
        components={{
          pre: ({ children }) => (
            <pre className="!bg-gray-900 !p-4 rounded-lg overflow-x-auto">
              {children}
            </pre>
          ),
          code: ({ children, className }) => (
            <code className={className}>
              {children}
            </code>
          ),
        }}
      >
        {markdownCode}
      </ReactMarkdown>
    </div>
  );
};
