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
