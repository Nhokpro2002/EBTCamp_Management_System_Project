// make feature get data stage, task
// change name task and save database
// each create new project, auto call api save 5 stage: Design, Mechanical, Assembly, Electric, Program
// create new task -> update UI
// make link line
// drag task bar moving new position => save change to database
// change task progress => save database
// change project name on the header
// dat/week/month header => time
// design idel to delete task

// =====================================================
// Today Line
// =====================================================
export function renderTodayLine() {
    const today = new Date();
    const pos = gantt.posFromDate(today);

    const container = gantt.$task;
    if (!container) return;

    // remove cũ
    const old = document.getElementById("today_line");
    if (old) old.remove();

    const oldLabel = document.getElementById("today_label");
    if (oldLabel) oldLabel.remove();

    // ================= LINE =================
    const line = document.createElement("div");
    line.id = "today_line";
    line.className = "gantt_today_line";
    line.style.left = pos + "px";
    line.style.top = "0px";
    line.style.height = gantt.$task.offsetHeight + "px";

    // ================= LABEL =================
    const label = document.createElement("div");
    label.id = "today_label";
    label.className = "gantt_today_label";
    label.style.left = (pos + 6) + "px";
    label.style.top = "5px";
    label.innerText = "Today";

    container.appendChild(line);
    container.appendChild(label);
}

/*function renderTaskHandlerSelect() {
    const $taskHandler = $("#task-handler");
    if (!$taskHandler.length) return;
    $taskHandler.empty();

    Object.values(userMap).forEach(user => {
        const $option = $("<option>", {
            value: user.id,
            text: user.employee_id
        });

        $taskHandler.append($option);
    });

    // Nếu chưa có instance TomSelect thì tạo mới
    if (!tomSelectTaskHandler) {

        tomSelectTaskHandler = new TomSelect(`#task-handler`, {
            plugins: ['remove_button'],
            hideSelected: true,
            create: false,
            placeholder: "Select task handlers",
        });

    } else {

        // Nếu đã có instance thì refresh options
        const instance = tomSelectTaskHandler;

        instance.clearOptions();

        Object.values(userMap).forEach(user => {
            instance.addOption({
                value: user.id,
                text: user.employee_id
            });
        });

        instance.refreshOptions(false);
    }
}*/

// =====================================================
// Task Color By Stage
// =====================================================
export function setTaskColor(task) {
    switch (task.css) {
        case "design":
            task.color = "#1976d2";
            task.progressColor = "#0d47a1";
            break;

        case "mechanical":
            task.color = "#00acc1";
            task.progressColor = "#00838f";
            break;

        case "assembly":
            task.color = "#43a047";
            task.progressColor = "#2e7d32";
            break;

        case "electric":
            task.color = "#fb8c00";
            task.progressColor = "#ef6c00";
            break;

        case "program":
            task.color = "#7b1fa2";
            task.progressColor = "#512da8";
            break;
    }
}