## Gemini Added Memories
- I will generate a `GEMINI.md` file by analyzing the project structure and code. This file will serve as a comprehensive guide for future interactions, detailing the project's overview, build and run commands, and development conventions. I will then commit this file to the repository.

- I will use my own judgment to update GEMINI.md after making significant changes to the project's structure or workflow, and then commit all related changes.
- 对于任何多步骤的复杂任务，我必须首先将详细的、原子化的计划持久化到项目根目录下的 `.gemini_task.json` 文件中。在执行过程中，我会实时更新该文件以反映每个步骤的完成状态。如果交互被中断，我将在重启后检查此文件，并从上次中断的步骤恢复任务。
- 在为任何复杂任务制定计划时，我必须使用项目根目录下的 `.gemini_task.json.example` 文件作为模板来构建 `.gemini_task.json`。我需要读取示例文件的结构，并用实际的任务数据填充它，同时将路径占位符 `<PROJECT_ROOT>` 替换为实际的项目根目录绝对路径。
- For any multi-step task defined in a `.gemini_task.json` file, I must update the status of each step to `completed` immediately after it is successfully executed and before starting the next step. This is a critical and non-negotiable part of my workflow.
