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
        M.toast({html: '请先选择所有三个文件夹！'});
        return;
    }

    startBtn.disabled = true;
    progressContainer.innerHTML = '<div class="center-align">扫描文件中...</div>';

    const jobs = await window.electronAPI.generateJobs(folders);

    if (jobs.length === 0) {
        progressContainer.innerHTML = '<div class="center-align">未找到可处理的视频文件。</div>';
        startBtn.disabled = false;
        return;
    }

    progressContainer.innerHTML = '';
    jobs.forEach(job => {
        const jobElement = document.createElement('a'); // Materialize collections are anchor tags
        jobElement.className = 'collection-item';
        jobElement.id = job.id;
        jobElement.innerHTML = `
            <div class="job-name">${job.outputFileName}</div>
            <div class="progress">
                <div class="determinate" style="width: 0%"></div>
            </div>
            <div class="job-status">等待中...</div>
        `;
        progressContainer.appendChild(jobElement);
    });

    window.electronAPI.runJobs(folders, jobs);
});

window.electronAPI.onUpdateSpecificProgress((event, { jobId, percentage, status }) => {
    const jobElement = document.getElementById(jobId);
    if (jobElement) {
        const progressBar = jobElement.querySelector('.determinate');
        const statusElement = jobElement.querySelector('.job-status');

        progressBar.style.width = percentage + '%';
        statusElement.textContent = status;

        // Add color coding for status
        if (status === 'Done') {
            statusElement.classList.add('green-text');
        } else if (status === 'Error') {
            statusElement.classList.add('red-text');
        } else if (status === 'Skipped') {
            statusElement.classList.add('orange-text');
        }

        // Check if all jobs are complete
        const allProgressBars = progressContainer.querySelectorAll('.determinate');
        const allDone = Array.from(allProgressBars).every(p => p.style.width === '100%');
        if (allDone) {
            startBtn.disabled = false;
            M.toast({html: '所有任务已完成！'});
        }
    }
});
