const fs = require('fs');
const path = require('path');
const { spawn, execFile } = require('child_process');
const ffmpegPath = require('ffmpeg-static').replace('app.asar', 'app.asar.unpacked');
const ffprobePath = require('ffprobe-static').path.replace('app.asar', 'app.asar.unpacked');

// --- Public Functions ---

function generateJobList(folders) {
  const prefixFiles = fs.readdirSync(folders.prefix).filter(f => f.endsWith('.mp4') || f.endsWith('.mov'));
  const suffixFiles = fs.readdirSync(folders.suffix).filter(f => f.endsWith('.mp4') || f.endsWith('.mov'));

  const jobs = [];
  let prefixCounter = 1;
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  for (const prefixFile of prefixFiles) {
    let suffixCounter = 0;
    for (const suffixFile of suffixFiles) {
      const letter = letters[suffixCounter] || `Z${suffixCounter - 25}`;
      const outputFileName = `${prefixCounter}-${letter}-${path.parse(prefixFile).name}-${path.parse(suffixFile).name}.mp4`;
      
      jobs.push({
        id: outputFileName, // Use the unique output name as the job ID
        prefixFile,
        suffixFile,
        outputFileName
      });
      suffixCounter++;
    }
    prefixCounter++;
  }
  return jobs;
}

async function runJobs(folders, jobs, setProcess, progressUpdater) {
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const logFilePath = path.join(folders.output, `log_${timestamp}.log`);
  const logStream = fs.createWriteStream(logFilePath);
  const logToFile = (message) => {
    logStream.write(`${new Date().toISOString()} - ${message}\n`);
  };

  logToFile(`Starting batch process for ${jobs.length} jobs...`);

  try {
    for (const job of jobs) {
      const { prefixFile, suffixFile, outputFileName } = job;
      const prefixFilePath = path.join(folders.prefix, prefixFile);
      const suffixFilePath = path.join(folders.suffix, suffixFile);
      const outputFilePath = path.join(folders.output, outputFileName);

      if (fs.existsSync(outputFilePath)) {
        logToFile(`File exists, skipping: ${outputFileName}`);
        progressUpdater(job.id, 100, 'Skipped'); // Update UI to show skipped
        continue;
      }

      logToFile(`Processing: ${prefixFile} + ${suffixFile} -> ${outputFileName}`);

      const duration1 = await getDuration(prefixFilePath);
      const duration2 = await getDuration(suffixFilePath);
      const totalDuration = duration1 + duration2;

      const filterGraph = `[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black,fps=60[v0_padded]; [1:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black,fps=60[v1_padded]; [v0_padded][v1_padded]concat=n=2:v=1[v]; [0:a][1:a]concat=n=2:v=0:a=1[a]`;

      const ffmpeg = spawn(ffmpegPath, [
        '-i', prefixFilePath,
        '-i', suffixFilePath,
        '-filter_complex', filterGraph,
        '-map', '[v]',
        '-map', '[a]',
        outputFilePath
      ]);

      setProcess(ffmpeg);

      ffmpeg.stderr.on('data', (data) => {
        logStream.write(data);
        const timeMatch = data.toString().match(/time=(\d{2}:\d{2}:\d{2}\.\d{2})/);
        if (timeMatch && totalDuration > 0) {
          const currentTime = timeToSeconds(timeMatch[1]);
          const percentage = Math.round((currentTime / totalDuration) * 100);
          progressUpdater(job.id, percentage, 'Processing');
        }
      });

      await new Promise((resolve, reject) => {
        ffmpeg.on('close', (code) => {
          setProcess(null);
          if (code === 0) {
            progressUpdater(job.id, 100, 'Done');
            logToFile(`SUCCESS: Finished ${outputFileName}`);
            resolve();
          } else {
            progressUpdater(job.id, 100, 'Error');
            logToFile(`ERROR: FFmpeg exited with code ${code} for ${outputFileName}`);
            reject(new Error(`FFmpeg process exited with code ${code}`));
          }
        });
        ffmpeg.on('error', (err) => {
          setProcess(null);
          progressUpdater(job.id, 100, 'Error');
          logToFile(`FATAL: Could not start FFmpeg process. ${err.message}`);
          reject(err);
        });
      });
    }
    logToFile('--- All tasks complete ---');
  } catch (error) {
    logToFile(`FATAL BATCH ERROR: ${error.message}`);
  } finally {
    logStream.end();
  }
}

// --- Private Helper Functions ---

function getDuration(filePath) {
  return new Promise((resolve, reject) => {
    execFile(ffprobePath, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', filePath], (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(parseFloat(stdout));
    });
  });
}

function timeToSeconds(timeStr) {
  const parts = timeStr.split(':');
  return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
}

module.exports = { generateJobList, runJobs };
