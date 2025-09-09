const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static').replace('app.asar', 'app.asar.unpacked');

async function runConcatenation(folders, log, setProcess) {
  // Create a unique, timestamped log file in the output directory
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const logFilePath = path.join(folders.output, `log_${timestamp}.log`);
  const logStream = fs.createWriteStream(logFilePath);

  log(`详细日志将保存到: ${logFilePath}`);

  try {
    const prefixFiles = fs.readdirSync(folders.prefix).filter(f => f.endsWith('.mp4') || f.endsWith('.mov'));
    const suffixFiles = fs.readdirSync(folders.suffix).filter(f => f.endsWith('.mp4') || f.endsWith('.mov'));

    log(`找到 ${prefixFiles.length} 个前贴视频和 ${suffixFiles.length} 个后贴视频。`);

    for (const prefixFile of prefixFiles) {
      for (const suffixFile of suffixFiles) {
        const prefixFilePath = path.join(folders.prefix, prefixFile);
        const suffixFilePath = path.join(folders.suffix, suffixFile);
        
        const outputFileName = `${path.parse(prefixFile).name}-${path.parse(suffixFile).name}.mp4`;
        const outputFilePath = path.join(folders.output, outputFileName);

        if (fs.existsSync(outputFilePath)) {
          log(`
文件已存在，跳过: ${outputFileName}`);
          continue;
        }

        log(`
开始处理: ${prefixFile} + ${suffixFile} -> ${outputFileName}`);
        log('（此过程将进行格式标准化和重新编码，可能需要一些时间...）');

        const filterGraph = `[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black,fps=60[v0_padded]; [1:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black,fps=60[v1_padded]; [v0_padded][v1_padded]concat=n=2:v=1[v]; [0:a][1:a]concat=n=2:v=0:a=1[a]`;

        const ffmpeg = spawn(ffmpegPath, [
          '-i', prefixFilePath,
          '-i', suffixFilePath,
          '-filter_complex', filterGraph,
          '-map', '[v]',
          '-map', '[a]',
          outputFilePath
        ]);

        setProcess(ffmpeg); // Track the new process

        // Write FFmpeg's stderr to the log file
        ffmpeg.stderr.on('data', (data) => {
          logStream.write(data);
        });

        await new Promise((resolve, reject) => {
          ffmpeg.on('close', (code) => {
            setProcess(null); // Clear the tracked process
            if (code === 0) {
              log(`成功! 已保存到: ${outputFilePath}`);
              resolve();
            } else {
              log(`错误: FFmpeg 进程退出，代码 ${code}。详情请见日志文件。`);
              reject(new Error(`FFmpeg process exited with code ${code}`));
            }
          });
          ffmpeg.on('error', (err) => {
            setProcess(null); // Clear the tracked process
            log(`错误: 无法启动 FFmpeg 进程: ${err.message}`);
            reject(err);
          });
        });
      }
    }
    log('--- 所有任务完成 ---');
  } catch (error) {
    log(`发生严重错误: ${error.message}`);
  } finally {
    // Ensure the log stream is always closed
    logStream.end();
  }
}

module.exports = { runConcatenation };
