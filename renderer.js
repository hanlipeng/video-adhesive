const prefixBtn = document.getElementById('select-prefix');
const suffixBtn = document.getElementById('select-suffix');
const outputBtn = document.getElementById('select-output');
const startBtn = document.getElementById('start-process');

const prefixPath = document.getElementById('prefix-path');
const suffixPath = document.getElementById('suffix-path');
const outputPath = document.getElementById('output-path');
const progressBar = document.getElementById('progress-bar');

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

startBtn.addEventListener('click', () => {
    if (folders.prefix && folders.suffix && folders.output) {
        progressBar.value = 0; // Reset progress bar
        window.electronAPI.startProcess(folders);
    } else {
        alert('请先选择所有三个文件夹。');
    }
});

window.electronAPI.onUpdateProgress((event, percentage) => {
    progressBar.value = percentage;
});
