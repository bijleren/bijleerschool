import React from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { X, ExternalLink, Download, Youtube } from 'lucide-react';

interface WebWijzerContent {
  id: string;
  title: string;
  content_type: 'video' | 'file' | 'link';
  content_url: string;
  symbol: string;
  color: string;
}

interface WebWijzerContentViewerProps {
  content: WebWijzerContent;
  onClose: () => void;
}

export function WebWijzerContentViewer({ content, onClose }: WebWijzerContentViewerProps) {
  const getYouTubeEmbedUrl = (url: string) => {
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/)?.[1];
    return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1` : null;
  };

  const renderContent = () => {
    switch (content.content_type) {
      case 'video':
        const embedUrl = getYouTubeEmbedUrl(content.content_url);
        return embedUrl ? (
          <div className="space-y-4">
            <div className="flex justify-center">
              <Button
                onClick={() => window.open(content.content_url, '_blank')}
                className="inline-flex items-center gap-2"
                aria-label={`Open ${content.title} op YouTube in nieuw tabblad`}
              >
                <Youtube className="w-5 h-5" aria-hidden="true" />
                Video Bekijken op YouTube
              </Button>
            </div>
            <div className="aspect-video w-full bg-black rounded-lg overflow-hidden">
              <iframe
                src={embedUrl}
                title={content.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                aria-label={`YouTube video: ${content.title}`}
              />
            </div>
          </div>
        ) : (
          <div className="text-center py-12" role="alert">
            <p className="text-red-600 mb-4">Ongeldige YouTube URL</p>
            <a
              href={content.content_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline focus:ring-4 focus:ring-blue-300 focus:outline-none rounded"
              aria-label="Video openen in nieuw tabblad"
            >
              Video openen in nieuw tabblad
            </a>
          </div>
        );

      case 'file':
        return (
          <div className="text-center py-12">
            <div
              className="w-32 h-32 rounded-2xl mx-auto mb-6 flex items-center justify-center text-6xl"
              style={{ backgroundColor: content.color + '20' }}
              role="img"
              aria-label={`Icoon voor ${content.title}`}
            >
              {content.symbol}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{content.title}</h2>
            <p className="text-gray-600 mb-6">Klik op de knop hieronder om het bestand te downloaden</p>
            <Button
              onClick={() => {
                const link = document.createElement('a');
                link.href = content.content_url;
                link.download = '';
                link.target = '_blank';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="inline-flex items-center gap-2"
              aria-label={`Download bestand ${content.title}`}
            >
              <Download className="w-5 h-5" aria-hidden="true" />
              Bestand Downloaden
            </Button>
          </div>
        );

      case 'link':
        return (
          <div className="space-y-4">
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded" role="note">
              <p className="text-yellow-800 text-sm">
                Deze website wordt hieronder getoond. Voor de beste ervaring, klik op "Bezoek Website" om het in een nieuw tabblad te openen.
              </p>
            </div>
            <div className="flex justify-center mb-4">
              <Button
                onClick={() => window.open(content.content_url, '_blank')}
                className="inline-flex items-center gap-2"
                aria-label={`Open ${content.title} in nieuw tabblad`}
              >
                <ExternalLink className="w-5 h-5" aria-hidden="true" />
                Bezoek Website
              </Button>
            </div>
            <div className="border-4 border-gray-200 rounded-lg overflow-hidden" style={{ height: '600px' }}>
              <iframe
                src={content.content_url}
                title={`Website preview: ${content.title}`}
                className="w-full h-full"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                aria-label={`Preview van website ${content.title}`}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-4" role="main">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
              style={{ backgroundColor: content.color + '20' }}
              role="img"
              aria-label={`Icoon voor ${content.title}`}
            >
              {content.symbol}
            </div>
            <h1 className="text-3xl font-bold text-gray-900">{content.title}</h1>
          </div>
          <Button
            onClick={onClose}
            variant="secondary"
            aria-label={`Sluit ${content.title} en ga terug`}
          >
            <X className="w-5 h-5" aria-hidden="true" />
            <span className="sr-only">Sluiten</span>
          </Button>
        </header>

        <Card className="p-6">
          {renderContent()}
        </Card>
      </div>
    </div>
  );
}
