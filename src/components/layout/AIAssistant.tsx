import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Sparkles, Image, Music, Code, Globe, Key, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const examplePrompts = [
  {
    icon: Music,
    title: 'How do I create a sound API?',
    prompt: 'How do I create an API that searches for audio files on Freesound.org? I want users to search by keywords and get audio results.',
    category: 'Getting Started'
  },
  {
    icon: Image,
    title: 'Image processing help',
    prompt: 'I want to create an API for image uploads and transformations. What should I type in the Generate page?',
    category: 'Getting Started'
  },
  {
    icon: Key,
    title: 'How do I use my API keys?',
    prompt: 'I have an OpenWeatherMap API key. How do I use it when generating my weather API?',
    category: 'Help'
  },
  {
    icon: Code,
    title: 'Where do I start?',
    prompt: 'I\'m new to API-Creator. Can you walk me through creating my first API step by step?',
    category: 'Tutorial'
  },
  {
    icon: Globe,
    title: 'Example prompt for weather',
    prompt: 'Can you show me an example of what to type on the Generate page to create a weather API?',
    category: 'Examples'
  }
];

export const AIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hi! I\'m here to help you use API-Creator. Ask me how to:\n\n• Generate your first API\n• Store and use API keys\n• Navigate the platform\n• Get example prompts\n\nClick any example below or ask me anything!'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    const assistantMessageId = (Date.now() + 1).toString();

    try {
      const conversationHistory = messages
        .filter(m => m.role !== 'assistant' || m.content !== messages[0].content)
        .map(m => ({ role: m.role, content: m.content }));

      const response = await fetch(
        `${import.meta.env.VITE_FASTAPI_GATEWAY_URL}/api/ai-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: inputValue,
            conversationHistory: conversationHistory.slice(-6),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      const contentType = response.headers.get('content-type');
      console.log('Response content-type:', contentType);

      if (contentType?.includes('text/event-stream')) {
        console.log('Starting SSE stream...');
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let accumulatedContent = '';
        let buffer = '';

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim();
                if (data === '[DONE]') {
                  console.log('Stream complete');
                  continue;
                }

                try {
                  const parsed = JSON.parse(data);
                  console.log('Parsed SSE:', parsed);
                  if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                    accumulatedContent += parsed.delta.text;
                    setMessages(prev => {
                      const existing = prev.find(m => m.id === assistantMessageId);
                      if (existing) {
                        return prev.map(m =>
                          m.id === assistantMessageId
                            ? { ...m, content: accumulatedContent }
                            : m
                        );
                      } else {
                        return [...prev, {
                          id: assistantMessageId,
                          role: 'assistant',
                          content: accumulatedContent
                        }];
                      }
                    });
                  }
                } catch (e) {
                  console.error('Parse error:', e);
                }
              }
            }
          }
        }
      } else {
        const data = await response.json();
        if (data.fallback) {
          setMessages(prev => {
            const existing = prev.find(m => m.id === assistantMessageId);
            if (existing) {
              return prev.map(m =>
                m.id === assistantMessageId
                  ? { ...m, content: data.fallback }
                  : m
              );
            } else {
              return [...prev, {
                id: assistantMessageId,
                role: 'assistant',
                content: data.fallback
              }];
            }
          });
        }
      }
    } catch (error: any) {
      console.error('Error:', error);
      const fallbackMessage = 'I apologize, but I\'m having trouble connecting right now. Here are some tips for generating APIs:\n\n1. Store your API keys in the API Keys page\n2. Reference them by name when describing your API\n3. Include proper error handling and rate limiting\n4. Consider caching responses to reduce costs\n\nWhen ready, go to the Generate page and describe your API!';

      setMessages(prev => {
        const existing = prev.find(m => m.id === assistantMessageId);
        if (existing) {
          return prev.map(m =>
            m.id === assistantMessageId
              ? { ...m, content: fallbackMessage }
              : m
          );
        } else {
          return [...prev, {
            id: assistantMessageId,
            role: 'assistant',
            content: fallbackMessage
          }];
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleClick = (prompt: string) => {
    setInputValue(prompt);
  };

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full shadow-lg hover:shadow-xl flex items-center justify-center text-white z-40 hover:scale-110 transition-transform"
          >
            <MessageSquare className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col border-l border-gray-200 dark:border-gray-800"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-blue-600 to-purple-600">
              <div className="flex items-center gap-2 text-white">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-semibold">AI Assistant</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    ) : (
                      <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-3 prose-ul:my-3 prose-ol:my-3 prose-li:my-1 prose-headings:font-bold prose-headings:my-3 prose-strong:font-bold prose-strong:text-gray-900 dark:prose-strong:text-gray-100">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="leading-relaxed mb-3 last:mb-0">{children}</p>,
                            ul: ({ children }) => <ul className="space-y-2 my-3">{children}</ul>,
                            ol: ({ children }) => <ol className="space-y-2 my-3">{children}</ol>,
                            li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                            strong: ({ children }) => <strong className="font-bold text-gray-900 dark:text-white">{children}</strong>,
                            h1: ({ children }) => <h1 className="text-lg font-bold mb-3 mt-4 first:mt-0">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-sm font-bold mb-2 mt-3 first:mt-0">{children}</h3>,
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />

              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  Example Prompts
                </p>
                {examplePrompts.map((example, idx) => {
                  const Icon = example.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleExampleClick(example.prompt)}
                      className="w-full text-left p-3 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-950/30 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 transition-all group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {example.title}
                            </h4>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                              {example.category}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 group-hover:text-gray-900 dark:group-hover:text-gray-200">
                            {example.prompt}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-800">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
                  placeholder="Ask about API integrations..."
                  disabled={isLoading}
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
                <Button onClick={handleSend} size="sm" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                💡 Ask me how to use any feature on the platform!
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
