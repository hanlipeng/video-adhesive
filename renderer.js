const prefixBtn = document.getElementById('select-prefix');
const suffixBtn = document.getElementById('select-suffix');
const outputBtn = document.getElementById('select-output');
const startBtn = document.getElementById('start-process');

const prefixPath = document.getElementById('prefix-path');
const suffixPath = document.getElementById('suffix-path');
const outputPath = document.getElementById('output-path');
const progressContainer = document.getElementById('progress-container');

let folders = { prefix: '', suffix: '', output: '' };

async function selectAndSetPath(type, element) {
    const selectedPath = await window.electronAPI.selectFolder();
    if (selectedPath) {
        folders[type] = selectedPath;
        element.textContent = selectedPath;
    }
}

prefixBtn.addEventListener('click', () => selectAndSetPath('prefix', prefixPath));
suffixBtn.addEventListener('click', () => selectAndSetPath('suffix', suffixPath));
outputBtn.addEventListener('click', () => selectAndSetPath('output', outputPath));

startBtn.addEventListener('click', async () => {
    if (!folders.prefix || !folders.suffix || !folders.output) {
        alert('请先选择所有三个文件夹。');
        return;
    }

    // Disable button to prevent multiple starts
    startBtn.disabled = true;
    progressContainer.innerHTML = '扫描文件中...';

    const jobs = await window.electronAPI.generateJobs(folders);

    if (jobs.length === 0) {
        progressContainer.innerHTML = '未找到可处理的视频文件。';
        startBtn.disabled = false;
        return;
    }

    // Clear container and build the UI for each job
    progressContainer.innerHTML = '';
    jobs.forEach(job => {
        const jobElement = document.createElement('div');
        jobElement.className = 'job-item';
        jobElement.id = job.id;
        jobElement.innerHTML = `
            <span>${job.outputFileName}</span>
            <progress max="100" value="0"></progress>
            <span class="job-status">等待中...</span>
        `;
        progressContainer.appendChild(jobElement);
    });

    // Start the actual processing
    window.electronAPI.runJobs(folders, jobs);
});

window.electronAPI.onUpdateSpecificProgress((event, { jobId, percentage, status }) => {
    const jobElement = document.getElementById(jobId);
    if (jobElement) {
        jobElement.querySelector('progress').value = percentage;
        jobElement.querySelector('.job-status').textContent = status;

        // Re-enable start button when the last job is done or errored
        const allProgressBars = progressContainer.querySelectorAll('progress');
        const lastProgressBar = allProgressBars[allProgressBars.length - 1];
        if (jobElement.contains(lastProgressBar) && percentage === 100) {
            const allDone = Array.from(allProgressBars).every(p => p.value === 100);
            if (allDone) {
                startBtn.disabled = false;
            }
        }
    }
});