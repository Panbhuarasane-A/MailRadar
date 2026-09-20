import React, { useRef, useEffect, useState, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';

interface HtmlEmailViewerProps {
  htmlContent: string;
  className?: string;
}

export const HtmlEmailViewer: React.FC<HtmlEmailViewerProps> = ({
  htmlContent,
  className = '',
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState<number>(300);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Prepare sanitized & styled HTML document for iframe
  const processedHtml = useMemo(() => {
    if (!htmlContent) return '';

    let content = htmlContent.trim();

    const hasHtmlTag = /<html[^>]*>/i.test(content);
    const hasBodyTag = /<body[^>]*>/i.test(content);

    const injectedStyle = `
      <style>
        *, *::before, *::after {
          box-sizing: border-box;
        }
        html {
          margin: 0 !important;
          padding: 0 !important;
          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;
          overflow: hidden !important;
        }
        body {
          margin: 0 !important;
          padding: 8px 12px !important;
          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;
          background-color: #ffffff;
          color: #202124;
          font-family: Roboto, RobotoDraft, Helvetica, Arial, sans-serif;
          font-size: 14px;
          line-height: 1.5;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          word-break: break-word;
          overflow: hidden !important;
        }
        img {
          max-width: 100% !important;
          height: auto !important;
        }
        table {
          max-width: 100% !important;
        }
        a {
          color: #1a73e8;
          text-decoration: underline;
        }
        a:hover {
          color: #1557b0;
        }
      </style>
      <script>
        document.addEventListener('DOMContentLoaded', () => {
          // Force all links to open in new tab securely
          document.querySelectorAll('a').forEach(a => {
            a.setAttribute('target', '_blank');
            a.setAttribute('rel', 'noopener noreferrer');
          });

          let lastReportedHeight = 0;

          const measureAndSendHeight = () => {
            const b = document.body;
            if (!b) return;

            let h = b.scrollHeight || 0;

            // Check bounding bottom of child elements for accurate height
            if (b.children && b.children.length > 0) {
              let maxBottom = 0;
              for (let i = 0; i < b.children.length; i++) {
                const child = b.children[i];
                if (child.tagName === 'SCRIPT' || child.tagName === 'STYLE') continue;
                const rect = child.getBoundingClientRect();
                const bottom = rect.top + rect.height;
                if (bottom > maxBottom) maxBottom = bottom;
              }
              if (maxBottom > 0) {
                h = Math.max(h, Math.ceil(maxBottom) + 16);
              }
            }

            if (h > 50 && Math.abs(h - lastReportedHeight) > 6) {
              lastReportedHeight = h;
              window.parent.postMessage({ type: 'MAILRADAR_IFRAME_HEIGHT', height: h }, '*');
            }
          };

          measureAndSendHeight();
          setTimeout(measureAndSendHeight, 150);
          setTimeout(measureAndSendHeight, 500);
          setTimeout(measureAndSendHeight, 1200);

          const observer = new MutationObserver(measureAndSendHeight);
          observer.observe(document.body, { childList: true, subtree: true, attributes: true });

          window.addEventListener('load', measureAndSendHeight);
        });
      </script>
    `;

    if (hasHtmlTag || hasBodyTag) {
      if (/<head[^>]*>/i.test(content)) {
        return content.replace(/<head[^>]*>/i, `$&${injectedStyle}`);
      } else if (/<body[^>]*>/i.test(content)) {
        return content.replace(/<body[^>]*>/i, `<head>${injectedStyle}</head>$&`);
      } else {
        return `<head>${injectedStyle}</head>${content}`;
      }
    } else {
      return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/>${injectedStyle}</head><body>${content}</body></html>`;
    }
  }, [htmlContent]);

  // Listen for iframe postMessage height adjustments
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'MAILRADAR_IFRAME_HEIGHT' && typeof e.data.height === 'number') {
        const measured = Math.ceil(e.data.height);
        if (measured > 50) {
          setIframeHeight((prev) => {
            if (Math.abs(prev - measured) > 6) {
              return measured;
            }
            return prev;
          });
          setIsLoading(false);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleIframeLoad = () => {
    setIsLoading(false);
    try {
      const doc = iframeRef.current?.contentDocument || iframeRef.current?.contentWindow?.document;
      if (doc && doc.body) {
        doc.querySelectorAll('a').forEach((a) => {
          a.setAttribute('target', '_blank');
          a.setAttribute('rel', 'noopener noreferrer');
        });

        const h = Math.ceil(doc.body.scrollHeight || 0);
        if (h > 50) {
          setIframeHeight(h);
        }
      }
    } catch {}
  };

  return (
    <div className={`relative w-full rounded-xl overflow-hidden bg-white ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/90 z-10 min-h-[140px]">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
            <span>Loading message...</span>
          </div>
        </div>
      )}

      <iframe
        ref={iframeRef}
        title="Email Content"
        srcDoc={processedHtml}
        onLoad={handleIframeLoad}
        sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
        className="w-full border-none block"
        style={{
          height: `${iframeHeight}px`,
          minHeight: '120px',
        }}
      />
    </div>
  );
};
