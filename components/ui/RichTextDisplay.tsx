function toSafeHtml(html: string): string {
  if (html.trim().startsWith('<')) return html;
  return `<p>${html.replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`;
}

interface Props {
  html: string;
  className?: string;
}

export default function RichTextDisplay({ html, className }: Props) {
  return (
    <div
      className={[
        '[&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mt-3 [&_h2]:mb-1',
        '[&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-2 [&_h3]:mb-1',
        '[&_p]:text-sm [&_p]:text-foreground [&_p]:leading-relaxed [&_p]:mb-2',
        '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-sm [&_ul]:text-foreground [&_ul]:space-y-0.5 [&_ul]:mb-2',
        '[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:text-sm [&_ol]:text-foreground [&_ol]:space-y-0.5 [&_ol]:mb-2',
        '[&_strong]:font-semibold [&_strong]:text-foreground',
        '[&_em]:italic [&_em]:text-foreground',
        '[&_a]:text-link hover:[&_a]:text-link/80 [&_a]:underline',
        '[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground',
        className ?? '',
      ].join(' ')}
      dangerouslySetInnerHTML={{ __html: toSafeHtml(html) }}
    />
  );
}
