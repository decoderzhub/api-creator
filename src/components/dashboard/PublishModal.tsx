import { motion } from 'framer-motion';
import { X, Globe } from 'lucide-react';
import { Button } from '../ui/Button';
import { API } from '../../lib/types';

interface PublishModalProps {
  isOpen: boolean;
  api: API | null;
  isLoading: boolean;
  onClose: () => void;
  onPublish: () => void;
}

export const PublishModal = ({ isOpen, api, isLoading, onClose, onPublish }: PublishModalProps) => {
  if (!isOpen || !api) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              Publish to Marketplace
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Share your API with the community
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              API Name
            </h4>
            <p className="text-gray-900 dark:text-gray-100">{api.name}</p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              About
            </h4>
            <p className="text-gray-900 dark:text-gray-100">
              {api.about || 'No about section provided'}
            </p>
            {!api.about && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                You need to add an about section before publishing. Please edit your API.
              </p>
            )}
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <strong>Note:</strong> Once published, your API will be visible to all users in the marketplace. You can unpublish it at any time.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={onPublish}
            isLoading={isLoading}
            disabled={!api.about || isLoading}
          >
            <Globe className="w-4 h-4 mr-2" />
            Publish
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};
