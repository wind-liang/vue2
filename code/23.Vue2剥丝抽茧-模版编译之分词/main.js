const unicodeRegExp =
    /a-zA-Z\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u037D\u037F-\u1FFF\u200C-\u200D\u203F-\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD/;
const ncname = `[a-zA-Z_][\\-\\.0-9_a-zA-Z${unicodeRegExp.source}]*`;
const qnameCapture = `((?:${ncname}\\:)?${ncname})`;
const startTagOpen = new RegExp(`^<${qnameCapture}`);
const startTagClose = /^\s*(\/?)>/;
const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`);

export function parseHTML(html, options) {
    let index = 0;
    while (html) {
        let textEnd = html.indexOf("<");
        if (textEnd === 0) {
            // Start tag:
            const startTagMatch = parseStartTag();
            if (startTagMatch) {
                handleStartTag(startTagMatch);
                continue;
            }
            // End tag:
            var endTagMatch = html.match(endTag);
            if (endTagMatch) {
                var curIndex = index;
                advance(endTagMatch[0].length);
                parseEndTag(endTagMatch[1], curIndex, index);
                continue;
            }
        }

        let text, rest, next;
        if (textEnd >= 0) {
            rest = html.slice(textEnd);
            while (!endTag.test(rest) && !startTagOpen.test(rest)) {
                // < in plain text, be forgiving and treat it as text
                next = rest.indexOf("<", 1);
                if (next < 0) break;
                textEnd += next;
                rest = html.slice(textEnd);
            }
            text = html.substring(0, textEnd);
        }

        if (textEnd < 0) {
            text = html;
        }

        if (text) {
            advance(text.length);
        }

        if (options.chars && text) {
            options.chars(text, index - text.length, index);
        }
    }

    function advance(n) {
        index += n;
        html = html.substring(n);
    }

    function parseStartTag() {
        const start = html.match(startTagOpen);
        if (start) {
            const match = {
                tagName: start[1],
                attrs: [],
                start: index,
            };
            advance(start[0].length);
            let end = html.match(startTagClose);
            if (end) {
                match.unarySlash = end[1];
                advance(end[0].length);
                match.end = index;
                return match;
            }
        }
    }

    function handleStartTag(match) {
        const tagName = match.tagName;
        const unarySlash = match.unarySlash;
        const unary = !!unarySlash;
        options.start(tagName, unary, match.start, match.end);
    }

    function parseEndTag(tagName, start, end) {
        options.end(tagName, start, end);
    }
}
const template = "<div><span>3<5吗</span><span>?</span></div>";
console.log(template);
parseHTML(template, {
    start: (tagName, unary, start, end) => {
        console.log("开始标签：", tagName, unary, start, end);
    },
    end: (tagName, start, end) => {
        console.log("结束标签：", tagName, start, end);
    },
    chars: (text, start, end) => {
        console.log("文本：", text, start, end);
    },
});
