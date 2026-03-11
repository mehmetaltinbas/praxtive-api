import { FontSize } from "src/source/enums/font-size.enum";

export function mapFontSizeToEnum(size: number): FontSize {
    if (size > 20) return FontSize.TITLE;
    if (size > 14) return FontSize.SUB_TITLE;
    return FontSize.BODY;
}
