export interface PdfjsFontFaceObject {
    name: string; // full font name, e.g. "AAAAAD+TimesNewRomanPS-BoldMT"
    loadedName: string; // internal id like "g_d0_f3"
    fallbackName: string; // usually "sans-serif"
    mimetype: string; // e.g. "font/opentype"
}
