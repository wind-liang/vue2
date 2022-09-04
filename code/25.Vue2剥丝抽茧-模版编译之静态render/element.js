/**
 * Make a map and return a function for checking if a key
 * is in that map.
 */
export function makeMap(str, expectsLowerCase) {
    const map = Object.create(null);
    const list = str.split(",");
    for (let i = 0; i < list.length; i++) {
        map[list[i]] = true;
    }
    return expectsLowerCase
        ? (val) => map[val.toLowerCase()]
        : (val) => map[val];
}

export const isHTMLTag = makeMap(
    "html,body,base,head,link,meta,style,title," +
        "address,article,aside,footer,header,h1,h2,h3,h4,h5,h6,hgroup,nav,section," +
        "div,dd,dl,dt,figcaption,figure,picture,hr,img,li,main,ol,p,pre,ul," +
        "a,b,abbr,bdi,bdo,br,cite,code,data,dfn,em,i,kbd,mark,q,rp,rt,rtc,ruby," +
        "s,samp,small,span,strong,sub,sup,time,u,var,wbr,area,audio,map,track,video," +
        "embed,object,param,source,canvas,script,noscript,del,ins," +
        "caption,col,colgroup,table,thead,tbody,td,th,tr," +
        "button,datalist,fieldset,form,input,label,legend,meter,optgroup,option," +
        "output,progress,select,textarea," +
        "details,dialog,menu,menuitem,summary," +
        "content,element,shadow,template,blockquote,iframe,tfoot"
);

// this map is intentionally selective, only covering SVG elements that may
// contain child elements.
export const isSVG = makeMap(
    "svg,animate,circle,clippath,cursor,defs,desc,ellipse,filter,font-face," +
        "foreignobject,g,glyph,image,line,marker,mask,missing-glyph,path,pattern," +
        "polygon,polyline,rect,switch,symbol,text,textpath,tspan,use,view",
    true
);

export const isReservedTag = (tag) => {
    return isHTMLTag(tag) || isSVG(tag);
};
