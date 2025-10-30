import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Code2, Loader2 } from 'lucide-react';
import hljs from 'highlight.js/lib/core';
import typescript from 'highlight.js/lib/languages/typescript';
import 'highlight.js/styles/vs2015.css';

// Register TypeScript/TSX language
hljs.registerLanguage('typescript', typescript);

interface StreamingCodeViewerProps {
  isStreaming: boolean;
  streamedCode: string;
  finalCode?: string;
  language?: string;
}

export function StreamingCodeViewer({
  isStreaming,
  streamedCode,
  finalCode,
  language = 'tsx'
}: StreamingCodeViewerProps) {
  const codeRef = useRef<HTMLDivElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const [displayedCode, setDisplayedCode] = useState('');
  const [highlightedCode, setHighlightedCode] = useState('');

  useEffect(() => {
    if (finalCode) {
      setDisplayedCode(finalCode);
    } else if (streamedCode) {
      setDisplayedCode(streamedCode);
    }
  }, [streamedCode, finalCode]);

  // Highlight code as it updates
  useEffect(() => {
    if (displayedCode) {
      try {
        const highlighted = hljs.highlight(displayedCode, {
          language: 'typescript',
          ignoreIllegals: true
        }).value;
        setHighlightedCode(highlighted);
      } catch (err) {
        // If highlighting fails, use plain text
        setHighlightedCode(displayedCode);
      }
    }
  }, [displayedCode]);

  useEffect(() => {
    if (preRef.current) {
      preRef.current.scrollTop = preRef.current.scrollHeight;
    }
  }, [highlightedCode]);

  const getStatusIndicator = () => {
    if (finalCode) {
      return (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="flex items-center gap-2 text-green-600 dark:text-green-400"
        >
          <Check className="w-4 h-4" />
          <span className="text-sm font-medium">Generation Complete</span>
        </motion.div>
      );
    }

    if (isStreaming) {
      return (
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm font-medium">Generating component...</span>
        </div>
      );
    }

    return null;
  };

  const lineCount = displayedCode.split('\n').length;

  return (
    <div className="space-y-3">
      {/* Status Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-t-lg border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Component Code
          </span>
          {language && (
            <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
              {language}
            </span>
          )}
        </div>
        {getStatusIndicator()}
      </div>

      {/* Code Display */}
      <div className="relative">
        {displayedCode ? (
          <div
            ref={codeRef}
            className="relative rounded-b-lg overflow-hidden"
          >
            <pre
              ref={preRef}
              className="bg-gray-900 p-4 overflow-auto max-h-[600px] text-xs leading-relaxed font-mono rounded-b-lg"
              style={{ scrollBehavior: 'smooth' }}
            >
              <code
                className="hljs language-typescript"
                dangerouslySetInnerHTML={{ __html: highlightedCode }}
              />
            </pre>

            {/* Streaming Cursor */}
            {isStreaming && !finalCode && (
              <motion.div
                className="absolute bottom-6 left-4 w-2 h-4 bg-blue-500"
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
            )}

            {/* Line Count */}
            <div className="absolute top-2 right-2 px-2 py-1 bg-gray-800/80 backdrop-blur-sm rounded text-xs text-gray-400">
              {lineCount} {lineCount === 1 ? 'line' : 'lines'}
            </div>
          </div>
        ) : (
          <div className="bg-gray-900 rounded-b-lg p-8 text-center">
            <Code2 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">
              Waiting for code generation...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
