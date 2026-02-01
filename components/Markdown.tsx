import React from 'react';

interface MarkdownProps {
  content: string;
}

export const Markdown: React.FC<MarkdownProps> = ({ content }) => {
  if (!content) return null;

  // Split by double newlines for paragraphs
  const paragraphs = content.split('\n\n');

  return (
    <div className="space-y-3 text-sm leading-relaxed">
      {paragraphs.map((paragraph, pIndex) => {
        // Handle Lists
        if (paragraph.startsWith('- ') || paragraph.startsWith('* ')) {
          const items = paragraph.split(/\n[-*] /).filter(Boolean);
          return (
            <ul key={pIndex} className="list-disc pl-5 space-y-1">
              {items.map((item, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: parseInline(item) }} />
              ))}
            </ul>
          );
        }
        
        // Handle Numbered Lists
        if (/^\d+\. /.test(paragraph)) {
           const items = paragraph.split(/\n\d+\. /).filter(Boolean);
           return (
            <ol key={pIndex} className="list-decimal pl-5 space-y-1">
              {items.map((item, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: parseInline(item) }} />
              ))}
            </ol>
           );
        }

        // Handle Headers
        if (paragraph.startsWith('### ')) {
          return <h3 key={pIndex} className="font-semibold text-white mt-4" dangerouslySetInnerHTML={{ __html: parseInline(paragraph.replace('### ', '')) }} />;
        }
        if (paragraph.startsWith('## ')) {
          return <h2 key={pIndex} className="text-lg font-bold text-white mt-5 border-b border-white/10 pb-1" dangerouslySetInnerHTML={{ __html: parseInline(paragraph.replace('## ', '')) }} />;
        }

        // Standard Paragraph
        return (
          <p key={pIndex} dangerouslySetInnerHTML={{ __html: parseInline(paragraph) }} />
        );
      })}
    </div>
  );
};

// Simple helper to parse bold and italic
function parseInline(text: string): string {
  let parsed = text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>') // Bold
    .replace(/\*(.*?)\*/g, '<em class="text-zinc-300">$1</em>') // Italic
    .replace(/`(.*?)`/g, '<code class="bg-white/10 px-1 rounded text-xs font-mono">$1</code>') // Code
    .replace(/\n/g, '<br/>'); // Line breaks within paragraphs
  return parsed;
}
