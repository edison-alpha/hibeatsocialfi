import { useState, useEffect } from 'react';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface EditPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: {
    title?: string;
    description?: string;
    coverHash?: string;
    coverFile?: File;
  }) => Promise<void>;
  playlist: {
    id: string;
    title: string;
    description: string;
    cover: string;
  };
}

export default function EditPlaylistModal({ isOpen, onClose, onSave, playlist }: EditPlaylistModalProps) {
  const [title, setTitle] = useState(playlist.title);
  const [description, setDescription] = useState(playlist.description);
  const [coverHash, setCoverHash] = useState<string>('');
  const [coverPreview, setCoverPreview] = useState<string>(playlist.cover);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setTitle(playlist.title);
      setDescription(playlist.description);
      setCoverPreview(playlist.cover);
      setCoverHash('');
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [isOpen, playlist]);

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onloadend = () => {
      setCoverPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // ⚡ Upload to IPFS immediately
    setIsUploading(true);
    setUploadProgress(0);
    toast.info('Uploading cover to IPFS...');

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => (prev < 90 ? prev + 10 : prev));
      }, 300);

      const { ipfsService } = await import('@/services/ipfsService');
      const uploadResult = await ipfsService.uploadFile(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      // Extract hash from Pinata response
      const hash = uploadResult.IpfsHash || uploadResult.ipfsHash || uploadResult.Hash || uploadResult.hash || '';
      
      if (hash) {
        setCoverHash(hash);
        toast.success('Cover uploaded to IPFS!');
        console.log('✅ Cover uploaded:', hash);
      } else {
        throw new Error('No hash returned from IPFS');
      }
    } catch (error) {
      console.error('❌ Failed to upload cover:', error);
      toast.error('Failed to upload cover to IPFS');
      setCoverPreview(playlist.cover); // Revert to original
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    if (isUploading) {
      toast.error('Please wait for cover upload to complete');
      return;
    }

    setIsSubmitting(true);

    try {
      const updates: any = {};
      
      // Only include changed fields
      if (title !== playlist.title) {
        updates.title = title.trim();
      }
      
      if (description !== playlist.description) {
        updates.description = description.trim();
      }
      
      // Use the already uploaded coverHash
      if (coverHash) {
        updates.coverHash = coverHash;
      }

      if (Object.keys(updates).length === 0) {
        toast.info('No changes to save');
        onClose();
        return;
      }

      await onSave(updates);
      onClose();
    } catch (error) {
      console.error('Failed to update playlist:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Edit Playlist</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Cover Image */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Cover Image
            </label>
            <div className="flex items-start gap-4">
              {/* Preview */}
              <div className="relative w-32 h-32 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
                {coverPreview ? (
                  <>
                    <img
                      src={coverPreview}
                      alt="Cover preview"
                      className="w-full h-full object-cover"
                    />
                    {isUploading && (
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-2" />
                        <p className="text-xs text-white">{uploadProgress}%</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-gray-600" />
                  </div>
                )}
              </div>

              {/* Upload Button */}
              <div className="flex-1">
                <label className="cursor-pointer">
                  <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 hover:border-purple-500 transition-colors">
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-8 h-8 text-gray-400" />
                      <p className="text-sm text-gray-400">
                        Click to upload new cover
                      </p>
                      <p className="text-xs text-gray-500">
                        PNG, JPG up to 5MB
                      </p>
                    </div>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverChange}
                    className="hidden"
                    disabled={isSubmitting}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter playlist title"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={isSubmitting}
              maxLength={100}
            />
            <p className="text-xs text-gray-500 mt-1">
              {title.length}/100 characters
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter playlist description (optional)"
              rows={4}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              disabled={isSubmitting}
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">
              {description.length}/500 characters
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
