import { useState } from 'react';
import { FileCode, Eye, EyeOff } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface CodeDiffViewerProps {
  title: string;
  originalCode: string;
  fixedCode: string;
  language?: string;
}

export function CodeDiffViewer({ title, originalCode, fixedCode, language = 'python' }: CodeDiffViewerProps) {
  const [showDiff, setShowDiff] = useState(false);

  // Simple line-by-line diff
  const originalLines = originalCode.split('\n');
  const fixedLines = fixedCode.split('\n');
  const maxLines = Math.max(originalLines.length, fixedLines.length);

  const getDiffLines = () => {
    const diff: Array<{ type: 'same' | 'removed' | 'added', original?: string, fixed?: string, lineNum: number }> = [];

    for (let i = 0; i < maxLines; i++) {
      const origLine = originalLines[i];
      const fixLine = fixedLines[i];

      if (origLine === fixLine) {
        diff.push({ type: 'same', original: origLine, fixed: fixLine, lineNum: i + 1 });
      } else if (origLine && !fixLine) {
        diff.push({ type: 'removed', original: origLine, lineNum: i + 1 });
      } else if (!origLine && fixLine) {
        diff.push({ type: 'added', fixed: fixLine, lineNum: i + 1 });
      } else if (origLine !== fixLine) {
        diff.push({ type: 'removed', original: origLine, lineNum: i + 1 });
        diff.push({ type: 'added', fixed: fixLine, lineNum: i + 1 });
      }
    }

    return diff;
  };

  if (!showDiff) {
    return (
      <Card className="p-3 border-blue-500/20 bg-blue-500/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-blue-400">{title}</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowDiff(true)}
            className="text-xs"
          >
            <Eye className="w-3 h-3 mr-1" />
            View Changes
          </Button>
        </div>
      </Card>
    );
  }

  const diffLines = getDiffLines();
  const changedLines = diffLines.filter(l => l.type !== 'same').length;

  return (
    <Card className="p-4 border-blue-500/20 bg-blue-500/5">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileCode className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-semibold text-blue-400">{title}</span>
            </div>
            <p className="text-xs text-gray-400">
              {changedLines} line{changedLines !== 1 ? 's' : ''} changed
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowDiff(false)}
            className="text-xs"
          >
            <EyeOff className="w-3 h-3 mr-1" />
            Hide
          </Button>
        </div>

        <div className="bg-gray-900 rounded border border-gray-700 overflow-hidden">
          <div className="grid grid-cols-2 gap-px bg-gray-700">
            <div className="bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400 border-b border-gray-700">
              Original Code
            </div>
            <div className="bg-green-500/10 px-3 py-2 text-xs font-semibold text-green-400 border-b border-gray-700">
              Fixed Code
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            <div className="grid grid-cols-2 gap-px bg-gray-800">
              <div className="bg-gray-900">
                <pre className="text-[10px] font-mono p-3 text-gray-300">
                  {originalLines.map((line, i) => (
                    <div key={i} className={`${diffLines[i]?.type === 'removed' ? 'bg-red-500/10 text-red-300' : ''}`}>
                      <span className="text-gray-600 mr-3 select-none">{i + 1}</span>
                      {line}
                    </div>
                  ))}
                </pre>
              </div>
              <div className="bg-gray-900">
                <pre className="text-[10px] font-mono p-3 text-gray-300">
                  {fixedLines.map((line, i) => (
                    <div key={i} className={`${diffLines.find(d => d.lineNum === i + 1 && d.type === 'added') ? 'bg-green-500/10 text-green-300' : ''}`}>
                      <span className="text-gray-600 mr-3 select-none">{i + 1}</span>
                      {line}
                    </div>
                  ))}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
