const { parentPort, workerData } = require('worker_threads');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const ffprobeInstaller = require('@ffprobe-installer/ffprobe');
const fs = require('fs');
const progress = require('./progress');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);
function convertAndCompress(inputFilePath, outputFilePath, upload_id) {
    return new Promise((resolve, reject) => {
        ffmpeg(inputFilePath)
            .videoCodec('libx264')
            .format('mp4')
            .outputOptions('-preset fast')
            .outputOptions('-crf 35')
            .on('end', () => {
                resolve(outputFilePath);
            })
            .on('error', (err) => {
                reject(err);
            })
            .on("progress", (e) => {
                const json_raw = fs.readFileSync("./progress.json")
                const json_string = json_raw.toString()
                const json = JSON.parse(json_string)
                json[upload_id] = e.percent
                console.log({ json, percent: e.percent });
                fs.writeFileSync("./progress.json", JSON.stringify(json))
            })
            .save(outputFilePath);
    });
}

(async () => {
    try {
        await convertAndCompress(workerData.inputFilePath, workerData.outputFilePath, workerData.id);
        parentPort.postMessage({ status: 'done', outputFilePath: workerData.outputFilePath });
    } catch (err) {
        parentPort.postMessage({ status: 'error', message: err.message });
    } finally {
        fs.unlink(workerData.inputFilePath, (err) => { if (err) console.error(err); });
    }
})();