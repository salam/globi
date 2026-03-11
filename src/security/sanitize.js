const EVENT_HANDLER_PATTERN = /\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const SCRIPT_TAG_PATTERN = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const JAVASCRIPT_PROTOCOL_PATTERN = /javascript\s*:/gi;
const STYLE_EXPRESSION_PATTERN = /expression\s*\(/gi;

export function sanitizeHtml(input = '') {
  let output = String(input);
  output = output.replace(SCRIPT_TAG_PATTERN, '');
  output = output.replace(EVENT_HANDLER_PATTERN, '');
  output = output.replace(JAVASCRIPT_PROTOCOL_PATTERN, '');
  output = output.replace(STYLE_EXPRESSION_PATTERN, '');
  return output;
}
