import { useState } from 'react';
import { Share2, Check, Copy, Twitter, Facebook, MessageCircle } from 'lucide-react';
import { Button } from './Button';
import { Modal } from './Modal';

interface ShareButtonProps {
  title: string;
  text: string;
  url?: string;
  className?: string;
}

export function ShareButton({ title, text, url = window.location.href, className }: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch (err) {
        console.log('Share canceled or failed', err);
      }
    } else {
      setIsOpen(true);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleShare} className={className}>
        <Share2 className="w-4 h-4 mr-2" />
        <span className="hidden sm:inline">Share</span>
      </Button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Share">
        <div className="space-y-4">
          <div className="flex gap-2 p-2 border border-border rounded bg-surface items-center">
            <input type="text" readOnly value={url} className="flex-1 bg-transparent text-sm outline-none px-2 text-foreground" />
            <Button size="sm" onClick={copyLink} variant="secondary" className="px-3">
              {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2">
            <a href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 p-3 border border-border rounded-lg hover:bg-surface-hover transition-colors">
              <Twitter className="w-6 h-6 text-[#1DA1F2]" />
              <span className="text-xs font-medium text-foreground">Twitter</span>
            </a>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 p-3 border border-border rounded-lg hover:bg-surface-hover transition-colors">
              <Facebook className="w-6 h-6 text-[#1877F2]" />
              <span className="text-xs font-medium text-foreground">Facebook</span>
            </a>
            <a href={`https://wa.me/?text=${encodedText}%20${encodedUrl}`} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 p-3 border border-border rounded-lg hover:bg-surface-hover transition-colors">
              <MessageCircle className="w-6 h-6 text-[#25D366]" />
              <span className="text-xs font-medium text-foreground">WhatsApp</span>
            </a>
          </div>
        </div>
      </Modal>
    </>
  );
}
