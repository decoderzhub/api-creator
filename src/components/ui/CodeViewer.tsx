import { useMemo } from 'react';

interface CodeViewerProps {
  code: string;
  language?: string;
}

export const CodeViewer = ({ code, language = 'python' }: CodeViewerProps) => {
  const highlightedCode = useMemo(() => {
    if (language !== 'python') {
      return code;
    }

    const keywords = /\b(def|class|if|elif|else|for|while|return|import|from|as|try|except|finally|with|async|await|yield|lambda|pass|break|continue|raise|assert|in|is|not|and|or|None|True|False)\b/g;
    const strings = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g;
    const comments = /(#.*$)/gm;
    const functions = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g;
    const decorators = /(@[a-zA-Z_][a-zA-Z0-9_]*)/g;
    const numbers = /\b(\d+\.?\d*)\b/g;

    let highlighted = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    highlighted = highlighted
      .replace(strings, '<span class="text-green-400">$1</span>')
      .replace(comments, '<span class="text-gray-500 italic">$1</span>')
      .replace(decorators, '<span class="text-yellow-400">$1</span>')
      .replace(keywords, '<span class="text-purple-400 font-semibold">$1</span>')
      .replace(functions, '<span class="text-blue-400">$1</span>')
      .replace(numbers, '<span class="text-orange-400">$1</span>');

    return highlighted;
  }, [code, language]);

  const lines = code.split('\n');

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden">
      <div className="flex text-sm font-mono">
        <div className="select-none bg-gray-800 text-gray-500 text-right py-4 px-3 border-r border-gray-700">
          {lines.map((_, i) => (
            <div key={i} className="leading-6">
              {i + 1}
            </div>
          ))}
        </div>
        <div className="flex-1 overflow-x-auto">
          <pre className="py-4 px-4 text-gray-100 leading-6">
            <code dangerouslySetInnerHTML={{ __html: highlightedCode }} />
          </pre>
        </div>
      </div>
    </div>
  );
};
