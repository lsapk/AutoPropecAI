import React from 'react';

interface MarkdownProps {
  content: string;
}

const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');

const parseInlineToSafeHtml = (text: string): string => {
  const escaped = escapeHtml(text);
  return escaped
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="text-zinc-300">$1</em>')
    .replace(/`(.*?)`/g, '<code class="bg-white/10 px-1 rounded text-xs font-mono">$1</code>')
    .replace(/\n/g, '<br/>');
};

const renderListItems = (lines: string[]) =>
  lines.map((line, i) => {
    const clean = line.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '');
    return <li key={`${line}-${i}`} dangerouslySetInnerHTML={{ __html: parseInlineToSafeHtml(clean) }} />;
  });

export const Markdown: React.FC<MarkdownProps> = ({ content }) => {
  if (!content) return null;

  const paragraphs = content.split('\n\n');

  return (
    <div className="space-y-3 text-sm leading-relaxed">
      {paragraphs.map((paragraph, pIndex) => {
        const lines = paragraph.split('\n').filter(Boolean);

        if (lines.every((line) => /^[-*]\s+/.test(line))) {
          return (
            <ul key={`ul-${pIndex}`} className="list-disc pl-5 space-y-1">
              {renderListItems(lines)}
            </ul>
          );
        }

        if (lines.every((line) => /^\d+\.\s+/.test(line))) {
          return (
            <ol key={`ol-${pIndex}`} className="list-decimal pl-5 space-y-1">
              {renderListItems(lines)}
            </ol>
          );
        }

        if (paragraph.startsWith('### ')) {
          return (
            <h3
              key={`h3-${pIndex}`}
              className="font-semibold text-white mt-4"
              dangerouslySetInnerHTML={{ __html: parseInlineToSafeHtml(paragraph.replace('### ', '')) }}
            />
          );
        }

        if (paragraph.startsWith('## ')) {
          return (
            <h2
              key={`h2-${pIndex}`}
              className="text-lg font-bold text-white mt-5 border-b border-white/10 pb-1"
              dangerouslySetInnerHTML={{ __html: parseInlineToSafeHtml(paragraph.replace('## ', '')) }}
            />
          );
        }

        return <p key={`p-${pIndex}`} dangerouslySetInnerHTML={{ __html: parseInlineToSafeHtml(paragraph) }} />;
      })}
    </div>
  );
};
