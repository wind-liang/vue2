const template = "<div><span>hello></span><span>world></span></div>";
console.log(template);
parseHTML(template, {
    start: (tagName) => {
        console.log("开始标签：", tagName);
    },
    end: (tagName) => {
        console.log("结束标签", tagName);
    },
    chars: (text) => {
        console.log("文本", text);
    },
});
function advance(html) {
    return html.substring(1);
}
function parseHTML(template, options) {
    const STATE_ENUM = {
        START: 0,
        TAG_START: 1,
        END_TAG_START: 2,
        START_TAG_NAME: 3,
        END_TAG_NAME: 4,
        TEXT_TAG: 5,
    };
    let CURRENT_STATE = STATE_ENUM.START;
    let tagName = "";
    while (template) {
        const char = template[0];
        switch (CURRENT_STATE) {
            case STATE_ENUM.START:
                if (char === "<") {
                    CURRENT_STATE = STATE_ENUM.TAG_START;
                }
                if (/^[A-Za-z]$/.test(char)) {
                    tagName += char;
                    CURRENT_STATE = STATE_ENUM.TEXT_TAG;
                }
                template = advance(template);
                break;
            case STATE_ENUM.TAG_START:
                if (/^[A-Za-z]$/.test(char)) {
                    tagName += char;
                    CURRENT_STATE = STATE_ENUM.START_TAG_NAME;
                }
                if (char === "/") {
                    CURRENT_STATE = STATE_ENUM.END_TAG_START;
                }
                template = advance(template);
                break;
            case STATE_ENUM.END_TAG_START:
                if (/^[A-Za-z]$/.test(char)) {
                    tagName += char;
                    CURRENT_STATE = STATE_ENUM.END_TAG_NAME;
                }
                template = advance(template);
                break;
            case STATE_ENUM.START_TAG_NAME:
                if (/^[A-Za-z]$/.test(char)) {
                    tagName += char;
                }
                if (char === ">") {
                    CURRENT_STATE = STATE_ENUM.START;
                    options.start(tagName);
                    tagName = "";
                }
                template = advance(template);
                break;
            case STATE_ENUM.END_TAG_NAME:
                if (/^[A-Za-z]$/.test(char)) {
                    tagName += char;
                }
                if (char === ">") {
                    CURRENT_STATE = STATE_ENUM.START;
                    options.end(tagName);
                    tagName = "";
                }
                template = advance(template);
                break;
            case STATE_ENUM.TEXT_TAG:
                if (/^[A-Za-z]$/.test(char)) {
                    tagName += char;
                }
                if (char === "<") {
                    CURRENT_STATE = STATE_ENUM.TAG_START;
                    options.chars(tagName);
                    tagName = "";
                }
                template = advance(template);
                break;
            default:
                throw new Error("未知情况");
        }
    }
}
