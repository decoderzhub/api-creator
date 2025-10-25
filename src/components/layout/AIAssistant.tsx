import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Sparkles, Image, Music, Code, Globe, Key } from 'lucide-react';
import { Button } from '../ui/Button';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const examplePrompts = [
  {
    icon: Music,
    title: 'Sound API',
    prompt: 'Create an API that integrates with Freesound.org to search and retrieve audio files based on keywords. Include authentication and rate limiting.',
    category: 'Audio'
  },
  {
    icon: Image,
    title: 'Image Processing',
    prompt: 'Build an API that uses Cloudinary to upload, transform, and optimize images. Support multiple image formats and provide URL generation.',
    category: 'Images'
  },
  {
    icon: Globe,
    title: 'Weather Data',
    prompt: 'Create an API that fetches weather data from OpenWeatherMap and provides current conditions and forecasts. Include caching to reduce API calls.',
    category: 'Data'
  },
  {
    icon: Code,
    title: 'GitHub Integration',
    prompt: 'Build an API that integrates with GitHub to list repositories, create issues, and manage pull requests using my stored GitHub API key.',
    category: 'Integration'
  },
  {
    icon: Key,
    title: 'Using Your API Keys',
    prompt: 'When generating APIs that require third-party services, reference your stored API keys by name. Example: "Use my OpenAI API key for text generation"',
    category: 'Tip'
  }
];

export const AIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I can help you generate APIs with various integrations. Click on any example below or ask me anything!'
    }
  ]);
  const [inputValue, setInputValue] = useState('');

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue
    };

    setMessages(prev => [...prev, newMessage]);
    setInputValue('');

    setTimeout(() => {
      const response: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Great idea! Here are some tips for your API:\n\n1. Make sure to store your API keys in the API Keys page\n2. Reference them by name when describing your API\n3. Include proper error handling and rate limiting\n4. Consider caching responses to reduce costs\n\nWhen ready, go to the Generate page and paste this prompt!'
      };
      setMessages(prev => [...prev, response]);
    }, 1000);
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
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}

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
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask about API integrations..."
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button onClick={handleSend} size="sm">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Tip: Store your API keys in the API Keys page before generating!
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
