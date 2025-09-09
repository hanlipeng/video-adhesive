const fs = require('fs');
const path = require('path');
const { spawn, execFile } = require('child_process');
const EventEmitter = require('events');
const ffmpegPath = require('ffmpeg-static').replace('app.asar', 'app.asar.unpacked');
const ffprobePath = require('ffprobe-static').path.replace('app.asar', 'app.asar.unpacked');

class Concatenator extends EventEmitter {
    constructor(folders) {
        super();
        this._folders = folders;
        this._jobs = [];
        this._isCancelled = false;
        this._ffmpegProcess = null;
    }

    async start() {
        this.emit('status', 'generating');
        try {
            this._jobs = this._generateJobs();
            this.emit('jobs-generated', this._jobs);
            await this._runJobs();
            this.emit('status', 'done');
        } catch (error) {
            if (!this._isCancelled) {
                this.emit('error', error.message);
            }
            this.emit('status', 'done');
        }
    }

    cancel() {
        this._isCancelled = true;
        if (this._ffmpegProcess) {
            this._ffmpegProcess.kill();
        }
    }

    _generateJobs() {
        const prefixFiles = fs.readdirSync(this._folders.prefix).filter(f => f.endsWith('.mp4') || f.endsWith('.mov'));
        const suffixFiles = fs.readdirSync(this._folders.suffix).filter(f => f.endsWith('.mp4') || f.endsWith('.mov'));

        const jobs = [];
        let prefixCounter = 1;
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

        for (const prefixFile of prefixFiles) {
            let suffixCounter = 0;
            for (const suffixFile of suffixFiles) {
                const letter = letters[suffixCounter] || `Z${suffixCounter - 25}`;
                const outputFileName = `${prefixCounter}-${letter}-${path.parse(prefixFile).name}-${path.parse(suffixFile).name}.mp4`;
                jobs.push({ id: outputFileName, prefixFile, suffixFile, outputFileName });
                suffixCounter++;
            }
            prefixCounter++;
        }
        return jobs;
    }

    async _runJobs() {
        const logFilePath = path.join(this._folders.output, `log_${new Date().toISOString().replace(/:/g, '-')}.log`);
        const logStream = fs.createWriteStream(logFilePath);
        const logToFile = (message) => logStream.write(`${new Date().toISOString()} - ${message}\n`);

        logToFile(`Starting batch process for ${this._jobs.length} jobs...`);

        for (const job of this._jobs) {
            if (this._isCancelled) {
                logToFile('Batch was cancelled by user.');
                this.emit('progress', { jobId: job.id, percentage: 0, status: 'Cancelled' });
                continue;
            }

            const { prefixFile, suffixFile, outputFileName } = job;
            const outputFilePath = path.join(this._folders.output, outputFileName);

            if (fs.existsSync(outputFilePath)) {
                logToFile(`File exists, skipping: ${outputFileName}`);
                this.emit('progress', { jobId: job.id, percentage: 100, status: 'Skipped' });
                continue;
            }

            logToFile(`Processing: ${prefixFile} + ${suffixFile} -> ${outputFileName}`);

            const duration1 = await getDuration(path.join(this._folders.prefix, prefixFile));
            const duration2 = await getDuration(path.join(this._folders.suffix, suffixFile));
            const totalDuration = duration1 + duration2;

            const filterGraph = `[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black,fps=60[v0_padded]; [1:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black,fps=60[v1_padded]; [v0_padded][v1_padded]concat=n=2:v=1[v]; [0:a][1:a]concat=n=2:v=0:a=1[a]`;

            this._ffmpegProcess = spawn(ffmpegPath, [
                '-i', path.join(this._folders.prefix, prefixFile),
                '-i', path.join(this._folders.suffix, suffixFile),
                '-filter_complex', filterGraph,
                '-map', '[v]',
                '-map', '[a]',
                outputFilePath
            ]);

            this._ffmpegProcess.stderr.on('data', (data) => {
                logStream.write(data);
                if (this._isCancelled) return;
                const timeMatch = data.toString().match(/time=(\d{2}:\d{2}:\d{2}\.\d{2})/);
                if (timeMatch && totalDuration > 0) {
                    const currentTime = timeToSeconds(timeMatch[1]);
                    const percentage = Math.round((currentTime / totalDuration) * 100);
                    this.emit('progress', { jobId: job.id, percentage, status: 'Processing' });
                }
            });

            await new Promise((resolve, reject) => {
                this._ffmpegProcess.on('close', (code) => {
                    this._ffmpegProcess = null;
                    if (this._isCancelled) {
                        this.emit('progress', { jobId: job.id, percentage: 0, status: 'Cancelled' });
                        return resolve();
                    }
                    if (code === 0) {
                        this.emit('progress', { jobId: job.id, percentage: 100, status: 'Done' });
                        logToFile(`SUCCESS: Finished ${outputFileName}`);
                        resolve();
                    } else {
                        this.emit('progress', { jobId: job.id, percentage: 100, status: 'Error' });
                        logToFile(`ERROR: FFmpeg exited with code ${code} for ${outputFileName}`);
                        reject(new Error(`FFmpeg process exited with code ${code}`));
                    }
                });
                this._ffmpegProcess.on('error', (err) => {
                    this._ffmpegProcess = null;
                    this.emit('progress', { jobId: job.id, percentage: 100, status: 'Error' });
                    logToFile(`FATAL: Could not start FFmpeg process. ${err.message}`);
                    reject(err);
                });
            });
        }
        logToFile('--- All tasks complete ---');
        logStream.end();
    }
}

// --- Private Helper Functions ---
function getDuration(filePath) {
    return new Promise((resolve, reject) => {
        execFile(ffprobePath, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', filePath], (error, stdout, stderr) => {
            if (error) reject(error);
            else resolve(parseFloat(stdout));
        });
    });
}

function timeToSeconds(timeStr) {
    const parts = timeStr.split(':');
    return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
}

module.exports = { Concatenator };
