import { Marked } from 'marked';

export const md = new Marked({
  gfm: true,
  breaks: true,
  renderer: {
    link({ href, title, text }) {
      const t = title ? ` title="${title}"` : '';
      return `<a href="${href}"${t} target="_blank" rel="noopener noreferrer">${text}</a>`;
    },
  },
});

const _mdNoLinks = new Marked({
  gfm: true,
  breaks: true,
  renderer: {
    link({ text }) { return text; },
  },
});

export const mdNoLinks = (src: string): string => _mdNoLinks.parse(src) as string;
export const mdInline  = (src: string): string => _mdNoLinks.parseInline(src) as string;
