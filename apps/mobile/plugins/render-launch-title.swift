// Renders the Home's "Coworkers" title for the launch screen, which cannot rely on a bundled font:
// iOS may draw it before the app's fonts are registered. Same font, size, tracking and line box as
// AppText's largeTitle, so the image sits exactly where the app draws the text.
//
//   swift plugins/render-launch-title.swift   (from apps/mobile)

import CoreText
import Foundation
import ImageIO
import UniformTypeIdentifiers

let text = "Coworkers"
let fontSize: CGFloat = 30
let kern: CGFloat = -0.6
let lineHeight: CGFloat = 36
let inks: [(suffix: String, rgb: (CGFloat, CGFloat, CGFloat))] = [("", (0x0a, 0x0a, 0x0a)), ("-dark", (0xfa, 0xfa, 0xfa))]

let fontURL = URL(fileURLWithPath: "assets/fonts/Inter-Medium.ttf") as CFURL
guard let descriptors = CTFontManagerCreateFontDescriptorsFromURL(fontURL) as? [CTFontDescriptor], let descriptor = descriptors.first else {
    fatalError("Run from apps/mobile: assets/fonts/Inter-Medium.ttf not found")
}
let font = CTFontCreateWithFontDescriptor(descriptor, fontSize, nil)
let ascent = CTFontGetAscent(font)
let fontLineHeight = ascent + CTFontGetDescent(font) + CTFontGetLeading(font)
// React Native centres the font's own line inside a line height that differs from it.
let baselineFromTop = ascent + (lineHeight - fontLineHeight) / 2

for ink in inks {
    let color = CGColor(srgbRed: ink.rgb.0 / 255, green: ink.rgb.1 / 255, blue: ink.rgb.2 / 255, alpha: 1)
    let attributes: [CFString: Any] = [kCTFontAttributeName: font, kCTKernAttributeName: kern, kCTForegroundColorAttributeName: color]
    let line = CTLineCreateWithAttributedString(CFAttributedStringCreate(nil, text as CFString, attributes as CFDictionary))
    let width = ceil(CTLineGetTypographicBounds(line, nil, nil, nil)) + 1

    for scale in [2, 3] {
        let pixels = (width: Int(width) * scale, height: Int(lineHeight) * scale)
        let context = CGContext(data: nil, width: pixels.width, height: pixels.height, bitsPerComponent: 8, bytesPerRow: 0, space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
        context.scaleBy(x: CGFloat(scale), y: CGFloat(scale))
        context.setShouldSubpixelPositionFonts(true)
        context.setAllowsFontSmoothing(false)
        context.textPosition = CGPoint(x: 0, y: lineHeight - baselineFromTop)
        CTLineDraw(line, context)

        let out = URL(fileURLWithPath: "assets/launch/coworkers-title\(ink.suffix)@\(scale)x.png") as CFURL
        let destination = CGImageDestinationCreateWithURL(out, UTType.png.identifier as CFString, 1, nil)!
        CGImageDestinationAddImage(destination, context.makeImage()!, nil)
        CGImageDestinationFinalize(destination)
    }
    print("coworkers-title\(ink.suffix): \(Int(width)) x \(Int(lineHeight)) pt")
}
