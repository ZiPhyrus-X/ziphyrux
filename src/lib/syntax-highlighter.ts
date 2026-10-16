/**
 * VS Code Dark+ & Light+ Real-Time Syntax Highlighter Engine
 *
 * Fast, pure regex tokenization for Java, Python, C++, and JavaScript.
 * Generates styled HTML with VS Code token colors.
 */

export interface HighlightOptions {
  isDark?: boolean;
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function highlightCodeLines(
  rawCode: string,
  language: string,
  options: HighlightOptions = {}
): string[] {
  if (!rawCode) return [""];

  const isDark = options.isDark !== false; // Default dark
  const normLang = (language || "java").toLowerCase();
  const isPython = normLang.includes("python") || normLang === "py";
  const isJava = normLang.includes("java") && !normLang.includes("script");
  const isCpp = normLang.includes("cpp") || normLang.includes("c++") || normLang === "c";
  const isJs = normLang.includes("javascript") || normLang === "js";

  // VS Code Token Palette (monospaced regular weight for 100% pixel-perfect cursor tracking)
  const colors = isDark
    ? {
        comment: "color: #6a9955;",
        string: "color: #ce9178;",
        number: "color: #b5cea8;",
        control: "color: #c586c0;",
        keyword: "color: #569cd6;",
        type: "color: #4ec9b0;",
        func: "color: #dcdcaa;",
        variable: "color: #9cdcfe;",
        operator: "color: #d4d4d4;",
        punctuation: "color: #d4d4d4;",
      }
    : {
        comment: "color: #008000;",
        string: "color: #a31515;",
        number: "color: #098658;",
        control: "color: #af00db;",
        keyword: "color: #0000ff;",
        type: "color: #267f99;",
        func: "color: #795e26;",
        variable: "color: #001080;",
        operator: "color: #000000;",
        punctuation: "color: #000000;",
      };

  const lines = rawCode.replace(/\r\n/g, "\n").split("\n");
  const highlightedLines: string[] = [];

  let inBlockComment = false;

  for (let l = 0; l < lines.length; l++) {
    const line = lines[l];
    let result = "";
    let i = 0;

    while (i < line.length) {
      // 1. Block comments /* ... */
      if (inBlockComment) {
        const endIdx = line.indexOf("*/", i);
        if (endIdx !== -1) {
          const chunk = line.substring(i, endIdx + 2);
          result += `<span style="${colors.comment}">${escapeHtml(chunk)}</span>`;
          inBlockComment = false;
          i = endIdx + 2;
        } else {
          const chunk = line.substring(i);
          result += `<span style="${colors.comment}">${escapeHtml(chunk)}</span>`;
          i = line.length;
        }
        continue;
      }

      if (!isPython && line.startsWith("/*", i)) {
        inBlockComment = true;
        const endIdx = line.indexOf("*/", i + 2);
        if (endIdx !== -1) {
          const chunk = line.substring(i, endIdx + 2);
          result += `<span style="${colors.comment}">${escapeHtml(chunk)}</span>`;
          inBlockComment = false;
          i = endIdx + 2;
        } else {
          const chunk = line.substring(i);
          result += `<span style="${colors.comment}">${escapeHtml(chunk)}</span>`;
          i = line.length;
        }
        continue;
      }

      // 2. Single-line comments
      if (!isPython && line.startsWith("//", i)) {
        const chunk = line.substring(i);
        result += `<span style="${colors.comment}">${escapeHtml(chunk)}</span>`;
        i = line.length;
        continue;
      }

      if (isPython && line[i] === "#") {
        const chunk = line.substring(i);
        result += `<span style="${colors.comment}">${escapeHtml(chunk)}</span>`;
        i = line.length;
        continue;
      }

      // 3. String literals (double, single, backtick)
      const ch = line[i];
      if (ch === '"' || ch === "'" || ch === "`") {
        const quote = ch;
        let strContent = quote;
        let escaped = false;
        let j = i + 1;
        while (j < line.length) {
          const cur = line[j];
          strContent += cur;
          if (cur === "\\" && !escaped) {
            escaped = true;
          } else if (cur === quote && !escaped) {
            j++;
            break;
          } else {
            escaped = false;
          }
          j++;
        }
        result += `<span style="${colors.string}">${escapeHtml(strContent)}</span>`;
        i = j;
        continue;
      }

      // 4. Numbers
      if (/\d/.test(ch)) {
        let numStr = ch;
        let j = i + 1;
        while (j < line.length && /[\d.xXa-fA-F_]/.test(line[j])) {
          numStr += line[j];
          j++;
        }
        result += `<span style="${colors.number}">${escapeHtml(numStr)}</span>`;
        i = j;
        continue;
      }

      // 5. Identifiers & Keywords
      if (/[a-zA-Z_$]/.test(ch)) {
        let ident = ch;
        let j = i + 1;
        while (j < line.length && /[a-zA-Z0-9_$]/.test(line[j])) {
          ident += line[j];
          j++;
        }

        // Check if next token is '(' for function calls
        let nextK = j;
        while (nextK < line.length && /\s/.test(line[nextK])) nextK++;
        const isFunctionCall = nextK < line.length && line[nextK] === "(";

        // Check token classification
        if (
          ident === "return" ||
          ident === "if" ||
          ident === "else" ||
          ident === "elif" ||
          ident === "for" ||
          ident === "while" ||
          ident === "in" ||
          ident === "break" ||
          ident === "continue" ||
          ident === "yield" ||
          ident === "try" ||
          ident === "catch" ||
          ident === "finally" ||
          ident === "throw" ||
          ident === "throws" ||
          ident === "switch" ||
          ident === "case" ||
          ident === "default"
        ) {
          result += `<span style="${colors.control}">${escapeHtml(ident)}</span>`;
        } else if (
          ident === "class" ||
          ident === "def" ||
          ident === "function" ||
          ident === "public" ||
          ident === "private" ||
          ident === "protected" ||
          ident === "static" ||
          ident === "final" ||
          ident === "const" ||
          ident === "let" ||
          ident === "var" ||
          ident === "new" ||
          ident === "import" ||
          ident === "from" ||
          ident === "export" ||
          ident === "as" ||
          ident === "pass" ||
          ident === "self" ||
          ident === "this" ||
          ident === "super" ||
          ident === "null" ||
          ident === "true" ||
          ident === "false" ||
          ident === "None" ||
          ident === "True" ||
          ident === "False" ||
          ident === "undefined" ||
          ident === "nullptr" ||
          ident === "void"
        ) {
          result += `<span style="${colors.keyword}">${escapeHtml(ident)}</span>`;
        } else if (
          ident === "int" ||
          ident === "boolean" ||
          ident === "bool" ||
          ident === "char" ||
          ident === "double" ||
          ident === "float" ||
          ident === "long" ||
          ident === "String" ||
          ident === "Integer" ||
          ident === "Double" ||
          ident === "Float" ||
          ident === "Boolean" ||
          ident === "Long" ||
          ident === "Map" ||
          ident === "HashMap" ||
          ident === "List" ||
          ident === "ArrayList" ||
          ident === "Set" ||
          ident === "HashSet" ||
          ident === "Queue" ||
          ident === "Deque" ||
          ident === "Stack" ||
          ident === "vector" ||
          ident === "string" ||
          ident === "unordered_map" ||
          ident === "dict" ||
          ident === "list" ||
          ident === "set" ||
          ident === "tuple" ||
          ident === "Solution"
        ) {
          result += `<span style="${colors.type}">${escapeHtml(ident)}</span>`;
        } else if (isFunctionCall) {
          result += `<span style="${colors.func}">${escapeHtml(ident)}</span>`;
        } else {
          result += `<span style="${colors.variable}">${escapeHtml(ident)}</span>`;
        }

        i = j;
        continue;
      }

      // 6. Operators & Punctuation
      if (/[+\-*/%=<>!&|^~?:;,.]/.test(ch)) {
        result += `<span style="${colors.operator}">${escapeHtml(ch)}</span>`;
        i++;
        continue;
      }

      // 7. Brackets & Parens
      if (/[(){}[\]]/.test(ch)) {
        result += `<span style="${colors.punctuation}">${escapeHtml(ch)}</span>`;
        i++;
        continue;
      }

      // 8. Plain whitespace and other characters
      result += escapeHtml(ch);
      i++;
    }

    highlightedLines.push(result);
  }

  return highlightedLines;
}

export function highlightCode(
  rawCode: string,
  language: string,
  options: HighlightOptions = {}
): string {
  if (!rawCode) return "";
  return highlightCodeLines(rawCode, language, options).join("\n");
}
