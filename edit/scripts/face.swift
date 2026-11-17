// face.swift · local face track (Apple Vision, no download): one face box every 0.2 s of a video.
//   swift face.swift <video> <out.json> [step=0.2]
// Writes [{"t": s, "x":, "y":, "w":, "h":}] normalized to the frame, origin top-left; frames without a face are skipped.
import AVFoundation
import Vision
import Foundation

let args = CommandLine.arguments
let url = URL(fileURLWithPath: args[1]), out = URL(fileURLWithPath: args[2])
let step = args.count > 3 ? Double(args[3])! : 0.2
let asset = AVURLAsset(url: url)
let gen = AVAssetImageGenerator(asset: asset)
gen.appliesPreferredTrackTransform = true
gen.requestedTimeToleranceBefore = .zero; gen.requestedTimeToleranceAfter = .zero
let dur = CMTimeGetSeconds(asset.duration)
var rows: [[String: Double]] = []
var t = 0.0
while t < dur {
    if let img = try? gen.copyCGImage(at: CMTime(seconds: t, preferredTimescale: 600), actualTime: nil) {
        let req = VNDetectFaceRectanglesRequest()
        try? VNImageRequestHandler(cgImage: img, options: [:]).perform([req])
        if let f = (req.results ?? []).max(by: { $0.boundingBox.width < $1.boundingBox.width }) {
            let b = f.boundingBox
            rows.append(["t": (t * 1000).rounded() / 1000, "x": b.minX, "y": 1 - b.maxY, "w": b.width, "h": b.height])
        }
    }
    t += step
}
let data = try! JSONSerialization.data(withJSONObject: rows, options: [])
try! data.write(to: out)
print("face track: \(rows.count) boxes over \(String(format: "%.1f", dur)) s")
