import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Code2, Loader2 } from 'lucide-react';

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
  const codeRef = useRef<HTMLPreElement>(null);
  const [displayedCode, setDisplayedCode] = useState('');

  useEffect(() => {
    if (finalCode) {
      setDisplayedCode(finalCode);
    } else if (streamedCode) {
      setDisplayedCode(streamedCode);
    }
  }, [streamedCode, finalCode]);

  useEffect(() => {
    if (codeRef.current) {
      codeRef.current.scrollTop = codeRef.current.scrollHeight;
    }
  }, [displayedCode]);

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
          <div className="relative bg-gray-900 rounded-b-lg overflow-hidden">
            <pre
              ref={codeRef}
              className="p-4 overflow-auto max-h-[600px] text-sm leading-relaxed font-mono"
              style={{ scrollBehavior: 'smooth' }}
            >
              <code className="text-gray-100">{displayedCode}</code>
            </pre>

            {/* Streaming Cursor */}
            {isStreaming && !finalCode && (
              <motion.div
                className="absolute bottom-4 right-4 w-2 h-5 bg-blue-500"
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
