const prefixBtn = document.getElementById('select-prefix');
const suffixBtn = document.getElementById('select-suffix');
const outputBtn = document.getElementById('select-output');
const startBtn = document.getElementById('start-process');
const cancelBtn = document.getElementById('cancel-process');

const prefixPath = document.getElementById('prefix-path');
const suffixPath = document.getElementById('suffix-path');
const outputPath = document.getElementById('output-path');
const progressContainer = document.getElementById('progress-container');

let folders = { prefix: '', suffix: '', output: '' };

function setButtonsState(isProcessing) {
    startBtn.disabled = isProcessing;
    cancelBtn.disabled = !isProcessing;
}

async function selectAndSetPath(type, element) {
    const selectedPath = await window.electronAPI.selectFolder();
    if (selectedPath) {
        folders[type] = selectedPath;
        element.textContent = selectedPath;
    }
}

// Initial Setup
prefixBtn.addEventListener('click', () => selectAndSetPath('prefix', prefixPath));
suffixBtn.addEventListener('click', () => selectAndSetPath('suffix', suffixPath));
outputBtn.addEventListener('click', () => selectAndSetPath('output', outputPath));
setButtonsState(false);

// --- Task Flow ---

startBtn.addEventListener('click', () => {
    if (!folders.prefix || !folders.suffix || !folders.output) {
        M.toast({html: '请先选择所有三个文件夹！'});
        return;
    }
    setButtonsState(true);
    progressContainer.innerHTML = '<div class="center-align">扫描文件中...</div>';
    window.electronAPI.startTask(folders);
});

cancelBtn.addEventListener('click', () => {
    window.electronAPI.cancelTask();
});

// --- Event Listeners from Main Process ---

window.electronAPI.onJobsGenerated((event, jobs) => {
    if (jobs.length === 0) {
        progressContainer.innerHTML = '<div class="center-align">未找到可处理的视频文件。</div>';
        setButtonsState(false);
        return;
    }

    progressContainer.innerHTML = '';
    jobs.forEach(job => {
        const jobElement = document.createElement('a');
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
});

window.electronAPI.onProgress((event, { jobId, percentage, status }) => {
    const jobElement = document.getElementById(jobId);
    if (jobElement) {
        const progressBar = jobElement.querySelector('.determinate');
        const statusElement = jobElement.querySelector('.job-status');

        progressBar.style.width = percentage + '%';
        statusElement.textContent = status;

        statusElement.classList.remove('green-text', 'red-text');
        if (status === 'Done' || status === 'Skipped') {
            statusElement.classList.add('green-text');
        } else if (status === 'Error' || status === 'Cancelled') {
            statusElement.classList.add('red-text');
        }
    }
});

window.electronAPI.onStatus((event, status) => {
    if (status === 'done' || status === 'cancelled') {
        setButtonsState(false);
        M.toast({html: `任务已${status === 'done' ? '完成' : '取消'}！`});
    }
});
