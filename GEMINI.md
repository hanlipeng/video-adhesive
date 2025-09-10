# GEMINI.md

## Project Overview

This project is a desktop application built with **Electron.js** for batch concatenating video files. It provides a graphical user interface (GUI) for users to select input and output directories, and then it processes the video files using **FFmpeg**.

The application is designed to take videos from a "prefix" folder and a "suffix" folder, and concatenate them in pairs, creating new video files in an "output" folder. The core video processing logic is handled by the `ffmpeg` command-line tool, which is integrated into the application using the `ffmpeg-static` and `ffprobe-static` npm packages.

The user interface is built with standard web technologies (HTML, CSS, and JavaScript) and the Materialize CSS framework.

## Building and Running

### Running the application in development mode:

To run the application locally, use the following command:

```bash
npm start
```

This will start the Electron application in development mode.

### Building the application for distribution:

To build the application for macOS and Windows, use the following command:

```bash
npm run build
```

This will create a distributable application package (e.g., a `.dmg` file for macOS and an `.exe` installer for Windows) in the `dist` directory.

## Development Conventions

### Project Structure

*   `index.js`: The main entry point for the Electron application. It handles the creation of the browser window and the communication with the renderer process.
*   `index.html`: The main HTML file for the application's user interface.
*   `renderer.js`: The JavaScript file for the renderer process. It handles user interactions in the UI and communicates with the main process.
*   `preload.js`: A script that runs before the renderer process is loaded. It is used to expose Node.js functionality to the renderer process in a secure way using the `contextBridge`.
*   `concatenator.js`: This file contains the core logic for generating and running the video concatenation jobs. It uses `child_process` to spawn `ffmpeg` processes.
*   `package.json`: Defines the project's dependencies, scripts, and metadata.

### Inter-Process Communication (IPC)

The application uses Electron's IPC mechanism to communicate between the main process and the renderer process.

*   The `ipcMain` module is used in `index.js` to handle messages from the renderer process.
*   The `ipcRenderer` module is used in `preload.js` to send messages to the main process and to expose functionality to the renderer process via the `window.electronAPI` object.

### Video Processing

*   The `ffmpeg-static` and `ffprobe-static` packages are used to get the paths to the `ffmpeg` and `ffprobe` executables.
*   The `concatenator.js` file uses the `spawn` function from the `child_process` module to run `ffmpeg` as a separate process.
*   The application monitors the `stderr` output of the `ffmpeg` process to track the progress of the video concatenation.
