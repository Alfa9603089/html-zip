/**
 * Minifies HTML string while preserving specific SSI tags.
 * 
 * Strategy:
 * 1. Extract and placeholderize SSI tags (<!--# ... -->) to protect them.
 * 2. Protect <script>, <pre>, <textarea> tags (keep content exact).
 * 3. Extract and minify <style> tags (CSS minification).
 * 4. Remove standard HTML comments (<!-- ... -->).
 * 5. Collapse whitespace in HTML.
 * 6. Optimize Attributes (Quotes, Booleans, Redundant defaults).
 * 7. Restore protected content.
 */

const BOOLEAN_ATTRIBUTES = [
  'allowfullscreen', 'async', 'autofocus', 'autoplay', 'checked', 'compact', 'controls',
  'declare', 'default', 'defaultchecked', 'defaultmuted', 'defaultselected', 'defer',
  'disabled', 'enabled', 'formnovalidate', 'hidden', 'indeterminate', 'inert', 'ismap',
  'itemscope', 'loop', 'multiple', 'muted', 'nohref', 'noresize', 'noshade', 'novalidate',
  'nowrap', 'open', 'pauseonexit', 'readonly', 'required', 'reversed', 'scoped', 'seamless',
  'selected', 'sortable', 'truespeed', 'typemustmatch', 'visible'
];

const minifyCSS = (content: string): string => {
  return content
    // Remove comments /* ... */
    .replace(/\/\*[\s\S]*?\*\//g, "")
    // Collapse whitespace to single space
    .replace(/\s+/g, " ")
    // Remove whitespace around separators (: ; { } , >)
    .replace(/\s*([:;{},>])\s*/g, "$1")
    // Remove trailing semicolon in blocks
    .replace(/;}/g, "}")
    .trim();
};

const minifyJS = (content: string): string => {
  if (!content) return '';

  // 1. Remove multi-line comments
  let minified = content.replace(/\/\*[\s\S]*?\*\//g, '');

  // 2. Process line by line to remove single-line comments and trim
  const lines = minified.split('\n');
  const processedLines = [];

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    if (line.startsWith('//')) continue;

    let inString = false;
    let stringChar = '';
    let commentIndex = -1;

    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      const prev = i > 0 ? line[i - 1] : '';
      const next = i < line.length - 1 ? line[i + 1] : '';

      if (inString) {
        if (c === stringChar && prev !== '\\') {
          inString = false;
        }
      } else {
        if (c === '"' || c === "'" || c === '`') {
          inString = true;
          stringChar = c;
        } else if (c === '/' && next === '/') {
          if (prev !== ':') {
            commentIndex = i;
            break;
          }
        }
      }
    }

    if (commentIndex !== -1) {
      line = line.substring(0, commentIndex).trim();
    }

    if (line) {
      processedLines.push(line);
    }
  }

  minified = processedLines.join('\n');

  // 3. Safely collapse newlines
  minified = minified.replace(/([;{},])\n/g, '$1');
  minified = minified.replace(/\n([{}])/g, '$1');

  // 4. Collapse multiple spaces into one
  minified = minified.replace(/\s{2,}/g, ' ');

  return minified.trim();
};

/**
 * Calculates the Gzip size of a string using the browser's native CompressionStream.
 */
export const getGzipSize = async (text: string): Promise<number> => {
  if (!text) return 0;
  if (typeof CompressionStream === 'undefined') {
    // Fallback for very old browsers (unlikely in modern context, but safe)
    return new Blob([text]).size; 
  }
  
  try {
    const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
    const response = new Response(stream);
    const blob = await response.blob();
    return blob.size;
  } catch (e) {
    console.warn("CompressionStream failed", e);
    return new Blob([text]).size;
  }
};

/**
 * Removes spaces around '=' in attributes.
 * Matches: name = "value", name = 'value', name = value
 */
const cleanAttributeSpaces = (text: string): string => {
  return text.replace(/([a-z0-9:_-]+)\s*=\s*("[^"]*"|'[^']*'|[^\s"'=<>`]+)/gi, '$1=$2');
};

const optimizeAttributes = (html: string): string => {
  // Regex to find start tags: <tagName attributes...>
  return html.replace(/<([a-z0-9-]+)((?:\s+[a-z0-9:_-]+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^\s>]+))?)*)\s*(\/?)>/gi, (match, tagName, attrs, trailingSlash) => {
    let newAttrs = attrs;

    // 0. Remove spaces around '=' first
    newAttrs = cleanAttributeSpaces(newAttrs);

    // 1. Collapse Booleans: checked="checked" -> checked
    BOOLEAN_ATTRIBUTES.forEach(attr => {
       const regex = new RegExp(`\\s${attr}(=['"]${attr}['"]|=['"]['"])?`, 'gi');
       newAttrs = newAttrs.replace(regex, ` ${attr}`);
    });

    // 2. Remove Redundant Attributes (HTML5 defaults)
    const tag = tagName.toLowerCase();
    if (tag === 'script') {
        newAttrs = newAttrs.replace(/\s*type=['"]text\/javascript['"]/gi, '');
    }
    if (tag === 'style' || tag === 'link') {
        newAttrs = newAttrs.replace(/\s*type=['"]text\/css['"]/gi, '');
    }
    if (tag === 'form') {
        newAttrs = newAttrs.replace(/\s*method=['"]get['"]/gi, '');
    }
    if (tag === 'input') {
        newAttrs = newAttrs.replace(/\s*type=['"]text['"]/gi, '');
    }

    // 3. Remove Quotes: class="foo" -> class=foo
    // Only if value contains safe chars: a-z A-Z 0-9 - _ . :
    newAttrs = newAttrs.replace(/\s([a-z0-9:_-]+)=["']([a-zA-Z0-9\-\._:]+)["']/gi, ' $1=$2');

    // 4. Safe trailing slash: <input id=foo/> becomes <input id=foo /> to prevent browser parser treating / as part of the unquoted attribute value
    if (trailingSlash === '/') {
      if (newAttrs.length > 0 && !/[\s"']$/.test(newAttrs)) {
        newAttrs += ' ';
      }
    }

    return `<${tagName}${newAttrs}${trailingSlash}>`;
  });
};

const OPTIONAL_CLOSING_TAGS = [
  'html', 'head', 'body',
  'li', 'dt', 'dd',
  'option',
  'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'colgroup'
];

const removeOptionalClosingTags = (html: string): string => {
  const regex = new RegExp(`</(${OPTIONAL_CLOSING_TAGS.join('|')})\\s*>`, 'gi');
  return html.replace(regex, '');
};

export const minifyHTML = (html: string): string => {
  if (!html) return '';

  const ssiStore: Map<string, string> = new Map();
  let ssiIndex = 0;

  // 1. Protect SSI tags (<!--# ... -->)
  // Matches <!--# ... -[optional space]-[optional space]>
  let protectedHtml = html.replace(/<!--#[\s\S]*?-\s*-\s*>/g, (match) => {
    // Clean spaces inside SSI tag before hiding
    // 1. Tighten start: <!--# include -> <!--#include
    let cleanMatch = match.replace(/^<!--#\s+/, '<!--#');
    // 2. Clean spaces around =
    cleanMatch = cleanAttributeSpaces(cleanMatch);
    
    const key = `___SSI_PLACEHOLDER_${ssiIndex++}___`;
    ssiStore.set(key, cleanMatch);
    return key;
  });

  // 2. Protect <pre>, <textarea> content
  const preservedStore: Map<string, string> = new Map();
  let preservedIndex = 0;
  protectedHtml = protectedHtml.replace(/<(pre|textarea)[\s\S]*?>[\s\S]*?<\/\1>/gi, (match) => {
    const key = `___PRESERVED_PLACEHOLDER_${preservedIndex++}___`;
    preservedStore.set(key, match);
    return key;
  });

  // 3. Process <script> tags: Extract, Minify JS, and Protect
  const scriptStore: Map<string, string> = new Map();
  let scriptIndex = 0;
  protectedHtml = protectedHtml.replace(/<script([\s\S]*?)>([\s\S]*?)<\/script>/gi, (match, attrs, content) => {
    const key = `___SCRIPT_PLACEHOLDER_${scriptIndex++}___`;
    
    let cleanAttrs = cleanAttributeSpaces(attrs);
    cleanAttrs = cleanAttrs.replace(/\s*type=['"]text\/javascript['"]/gi, '');

    const minifiedJS = minifyJS(content);
    scriptStore.set(key, `<script${cleanAttrs}>${minifiedJS}</script>`);
    return key;
  });

  // 4. Process <style> tags: Extract, Minify CSS, and Protect
  const styleStore: Map<string, string> = new Map();
  let styleIndex = 0;
  protectedHtml = protectedHtml.replace(/<style([\s\S]*?)>([\s\S]*?)<\/style>/gi, (match, attrs, content) => {
    const key = `___STYLE_PLACEHOLDER_${styleIndex++}___`;
    
    // Clean style attributes too
    let cleanAttrs = cleanAttributeSpaces(attrs);
    // Apply defaults removal if strictly needed, but let's stick to cleaning
    cleanAttrs = cleanAttrs.replace(/\s*type=['"]text\/css['"]/gi, '');

    const minifiedCSS = minifyCSS(content);
    styleStore.set(key, `<style${cleanAttrs}>${minifiedCSS}</style>`);
    return key;
  });

  // 5. Remove standard comments
  let minified = protectedHtml.replace(/<!--[\s\S]*?-\s*-\s*>/g, '');

  // 6. Collapse whitespace in HTML
  minified = minified.replace(/\s+/g, ' ');

  // 7. Remove spaces between tags
  // Includes placeholders (ending in ___) as valid tag boundaries
  minified = minified.replace(/(>|___)\s+(<|___)/g, '$1$2');

  // 8. Optimize Attributes (Quotes, Booleans, Redundant)
  // We do this AFTER collapsing whitespace to ensure attributes are predictable
  minified = optimizeAttributes(minified);
  
  // 8.5 Remove optional closing tags
  minified = removeOptionalClosingTags(minified);

  // 9. Trim start and end
  minified = minified.trim();

  // 10. Restore Styles
  styleStore.forEach((value, key) => {
    minified = minified.replace(key, value);
  });

  // 11. Restore Scripts
  scriptStore.forEach((value, key) => {
    minified = minified.replace(key, value);
  });

  // 12. Restore Preserved tags
  preservedStore.forEach((value, key) => {
    minified = minified.replace(key, value);
  });

  // 13. Restore SSI tags
  ssiStore.forEach((value, key) => {
    minified = minified.replace(key, value);
  });

  return minified;
};

export const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};