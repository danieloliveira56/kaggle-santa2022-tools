let sf;
let w;
let h;
let x_shift;
let y_shift;
let idx = 0;
let submission;
let image_csv;
let fps = 60;
let speed = 1;
let speed_direction = 1;
let arm_colors;
let canvas;
let image_canvas;
let arm_canvas;
let text_canvas;
let config_canvas;
let scaling_factor = 5;
let config_map;
let trace_config = false;
let new_config = true;
let paused = false;
let last_idx=0;
let min_idx=1000000;
let max_idx=1000000;

let div_config = [
    [64, 0],
    [-32, 0],
    [-16, 0],
    [-8, 0],
    [-4, 0],
    [-2, 0],
    [-1, 0],
    [-1, 0],
];

let config_length = [
    64,
    32,
    16,
    8,
    4,
    2,
    1,
    1,
]

let cell_id = [
    ["x64", "y64"],
    ["x32", "y32"],
    ["x16", "y16"],
    ["x8", "y8"],
    ["x4", "y4"],
    ["x2", "y2"],
    ["x1", "y1"],
    ["x0", "y0"],
];
function preload() {
    loadTable('image.csv', 'csv', 'header', (table) => {
        image_csv = table;
        load_submission('submission82425.csv');
    });
}

function load_submission(submission_file) {
    let x_config;
    let y_config;
    loadTable(submission_file, 'csv', 'header', (table) => {
        submission = [];
        config_map = {};
        for (let idx = 0; idx < table.rows.length; idx++)
        {
            submission.push(table.rows[idx].arr[0].split(";"));
            [x_config, y_config] = config_to_cartesian(table.rows[idx].arr[0].split(";"));
            x_config -= 128;
            y_config = 128 - y_config;
            let xy_key = "(" + x_config + "," + y_config + ")";
            if (xy_key in config_map)
            {
                config_map[xy_key].push(idx);
            }
            else
            {
                config_map[xy_key] = [idx];
            }
        }
        document.getElementById("solution_size").textContent = submission.length-1;
        min_idx = 0;
        max_idx = submission.length;

        select("#min_idx").value(min_idx);
        select("#max_idx").value(max_idx-1);
        reset();
    });
}

function setSize() {
    w = select("#canvas").width;
    h = select("#canvas").height;
    w = min(w,h);
}

function windowResized() {
    setSize();
    resizeCanvas(w, h);
}

function reset_canvases() {
    background(220);
    image_canvas.clear();
    arm_canvas.clear();
    text_canvas.clear();
    config_canvas.clear();

    image_canvas.noStroke();
    image_canvas.square(-1,-1, scaling_factor*257);
}

function write_div_config() {
    select("#x64 > span").html(div_config[0][0]);
    select("#y64 > span").html(div_config[0][1]);
    select("#x32 > span").html(div_config[1][0]);
    select("#y32 > span").html(div_config[1][1]);
    select("#x16 > span").html(div_config[2][0]);
    select("#y16 > span").html(div_config[2][1]);
    select("#x8 > span").html(div_config[3][0]);
    select("#y8 > span").html(div_config[3][1]);
    select("#x4 > span").html(div_config[4][0]);
    select("#y4 > span").html(div_config[4][1]);
    select("#x2 > span").html(div_config[5][0]);
    select("#y2 > span").html(div_config[5][1]);
    select("#x1 > span").html(div_config[6][0]);
    select("#y1 > span").html(div_config[6][1]);
    select("#x0 > span").html(div_config[7][0]);
    select("#y0 > span").html(div_config[7][1]);

    if (!trace_config) config_canvas.clear();
    if (frameCount % 60 < 30) {
        let x_div_config;
        let y_div_config;
        [x_div_config, y_div_config] = config_arr_to_cartesian(div_config);
        config_canvas.stroke('magenta');
        scaled_plot(config_canvas, x_div_config, y_div_config);
    }

    if (new_config) {
        // 64 0;-32 0;-16 0;-8 0;-4 0;-2 0;-1 0;-1 0
        config_str = div_config.map((xy)=>{return xy.join(" ");}).join(";");
        select("#solution").html(config_str + "\n", true);
        document.getElementById("solution").scrollTop = document.getElementById("solution").scrollHeight;
        new_config = false;
    }

    image(config_canvas, 0, 0);
}

function setup() {
    select(".config-cell")
    selectAll(".config-cell").forEach((element)=>{
        element.mouseClicked((e)=>{
            let i, j;
            [i, j] = Array.from(e.target.getAttribute('component'));
            let cell_status = e.target.getAttribute('status');
            if (cell_status == "free") {
                // Lock clicked cell
                let l = config_length[i];
                if (Math.sign(div_config[i][j]) >= 0) {
                    div_config[i][j] = l;
                } else {
                    div_config[i][j] = -l;
                }
                e.target.setAttribute("status", "locked");
                e.target.classList.remove("free");
                e.target.classList.add("locked");

               // Unlock neighbor cell
               let k = Math.abs(j-1);
               neighbor_id = "#" + cell_id[i][k];
               select(neighbor_id).attribute("status", "free");
               select(neighbor_id).removeClass("locked");
               select(neighbor_id).addClass("free");
            } else if (cell_status == "locked") {
                // Flip cell sign
                div_config[i][j] = -div_config[i][j];
            }
        });

        element.mouseWheel((event)=>{
            let i, j;
            [i, j] = Array.from(event.target.getAttribute('component'));
            let delta = -Math.sign(event.deltaY);
            if (delta) {
                let cur_x, cur_y;
                let l = config_length[i];
                [cur_x, cur_y] = div_config[i];
                if (j == 0) {
                    if ((Math.abs(cur_y) == l) && (Math.abs(cur_x + delta) <= l)) {
                        div_config[i][j] += delta;
                        new_config = true;
                    }
                } else {
                    if ((Math.abs(cur_x) == l) && (Math.abs(cur_y + delta) <= l)) {
                        div_config[i][j] += delta;
                        new_config = true;
                    }
                }
            }
        });
    });


    sf=.7;
    x_shift = 20
    y_shift = 20
    setSize();
    canvas = createCanvas(w, h).parent("canvas");
    image_canvas = createGraphics(scaling_factor*257, scaling_factor*257);
    arm_canvas = createGraphics(scaling_factor*257, scaling_factor*257);
    text_canvas = createGraphics(scaling_factor*257, scaling_factor*257);
    config_canvas = createGraphics(scaling_factor*257, scaling_factor*257);

    image_canvas.parent("canvas");
    arm_canvas.parent("canvas");
    text_canvas.parent("canvas");
    config_canvas.parent("canvas");

    reset_canvases();

    strokeWeight(2);

    arm_colors = [
        color('#c62500'),
        color('#49E020'),
        color('#3836E0'),
        color('#E05409'),
        color('#D52DE0'),
        color('#068694'),
        color('#E0AD09'),
        color('#000000')
    ];
}

function pause() {
    paused = !paused;
    if (paused) {
        document.getElementById("pause_btn").value = "Unpause";
        document.getElementById("decrease_pixel").disabled = false;
        document.getElementById("increase_pixel").disabled = false;
    } else {
        document.getElementById("pause_btn").value = "Pause";
        document.getElementById("decrease_pixel").disabled = true;
        document.getElementById("increase_pixel").disabled = true;
    }
}

function config_to_cartesian(config) {
    let x = 128;
    let y = 128;
    for (let j = 0; j < config.length; j++) {
        [config_x, config_y] = config[j].split(" ");
        x += int(config_x);
        y -= int(config_y);
    }
    return [x, y]
}

function config_arr_to_cartesian(config) {
    let x = 128;
    let y = 128;
    for (let j = 0; j < config.length; j++) {
        [config_x, config_y];
        x += config[j][0];
        y -= config[j][1];
    }
    return [x, y]
}


function get_image_rgb(x, y) {
    [_, _, r, g, b] = image_csv.rows[257 * y + x].arr;
    return [r, g, b]
}

function draw_config(config) {
    let x_config;
    let y_config;
    [x_config, y_config] = config_to_cartesian(config);

    [_, _, r, g, b] = image_csv.rows[257 * y_config + x_config].arr;
    image_canvas.stroke(color(r * 255, g * 255, b * 255));
    scaled_plot(image_canvas, x_config, y_config);
}

function scaled_plot(canvas, x, y) {
    for (let scaled_x = scaling_factor * x; scaled_x < scaling_factor * x + scaling_factor; scaled_x++) {
        for (let scaled_y = scaling_factor * y; scaled_y < scaling_factor * y + scaling_factor; scaled_y++) {
            canvas.point(scaled_x, scaled_y);
        }
    }
}

function undraw_config(config) {
    let x_config;
    let y_config;
    [x_config, y_config] = config_to_cartesian(config);

    image_canvas.stroke(222);
    scaled_plot(image_canvas, x_config, y_config);
}

function draw_arm(config) {
    let x = 128;
    let y = 128;
    let arm_pts = [[x,y]]
    for (let j = 0; j < config.length; j++) {
        [config_x, config_y] = config[j].split(" ");
        x += int(config_x);
        y -= int(config_y);
        arm_pts.push([x,y]);
    }
    arm_canvas.clear();
    arm_canvas.strokeWeight(1/sf);
    for (let j = 1; j < arm_pts.length; j++) {
        arm_canvas.stroke(arm_colors[j - 1]);
        arm_canvas.line(scaling_factor * arm_pts[j - 1][0], scaling_factor * arm_pts[j - 1][1], scaling_factor * arm_pts[j][0], scaling_factor * arm_pts[j][1]);
    }
    image(arm_canvas, 0, 0);
}

function mouseClicked() {
    console.log("---Debug Data---");
    console.log("w: " + w);
    console.log("h: " + h);
    console.log("window.innerWidth: " + window.innerWidth);
    console.log("window.innerHeight: " + window.innerHeight);
    console.log("mouseX: " + mouseX);
    console.log("mouseY: " + mouseY);
    console.log("x_shift: " + x_shift);
    console.log("y_shift: " + y_shift);
    console.log("sf: " + sf);
    console.log("mouseX / sf: " + mouseX / sf);``
    console.log("mouseX * sf: " + mouseX * sf);
    console.log("mouseY / sf: " + mouseY / sf);
    console.log("mouseY * sf: " + mouseY * sf);
    console.log("---End of Debug Data---");
}

function draw_textbox() {
text_canvas.textStyle(NORMAL);
    text_size = 10;
    text_canvas.textSize();
    text_canvas.strokeWeight(1 / sf);

    let x = Math.trunc((mouseX - x_shift) / sf / scaling_factor);
    let y = Math.trunc((mouseY - y_shift) / sf / scaling_factor);
    text_canvas.clear();
    if (x >= 0 && x < 257 && y >= 0 && y < 257) {
        noCursor();
        text_canvas.stroke(1);
        [r, g, b] = get_image_rgb(x, y);
        let pixel_str = "(" + (x - 128) + ", " + (128 - y) + ")";
        text_canvas.fill("black");
        scaled_plot(canvas, x, y);

        let y0_offset = text_size;
        let y_offset = text_size * 1.5;
        text_canvas.stroke("red");
        text_canvas.fill("red");
        text_canvas.text(Math.round(r * 100) / 100, mouseX, mouseY + y0_offset + y_offset);
        text_canvas.stroke("green");
        text_canvas.fill("green");
        text_canvas.text(Math.round(g * 100) / 100, mouseX, mouseY + y0_offset + 2 * y_offset);
        text_canvas.stroke("blue");
        text_canvas.fill("blue");
        text_canvas.text(Math.round(b * 100) / 100, mouseX, mouseY + y0_offset + 3 * y_offset);
        text_canvas.stroke("black");
        text_canvas.fill("black");
        text_canvas.text(pixel_str, mouseX, mouseY + y0_offset);

        let y_position = mouseY + y0_offset + 4 * y_offset;
        let config_key = "(" + (x - 128) + "," + (128 - y) + ")";
        for (const i of config_map[config_key]) {
            config_str = i + ": " + submission[i];
            text_canvas.text(config_str, mouseX, y_position);
            y_position+=y_offset;
        }
    }
    else {
        cursor();
    }
    image(text_canvas, 0, 0);
}


function draw() {
    translate(x_shift, y_shift);
    scale(sf);
    background(220);

    min_idx =  int(select("#min_idx").value());
    max_idx =  int(select("#max_idx").value());
    idx = max(min_idx, idx);

    if (submission && !paused && min_idx < idx && idx < max_idx) {
        if (speed_direction > 0) {
            last_idx = min(idx+speed-1, submission.length-1);
            for (let j = idx; j <= last_idx; j++) {
                draw_config(submission[j]);
            }
        } else {
            last_idx = max(0, idx + speed_direction * speed);
            for (let j = idx; j > last_idx; j--) {
                undraw_config(submission[j]);
            }
        }
    }

    image(image_canvas, 0, 0);
    update_pixel_info(last_idx);
    write_div_config();
    draw_textbox();

    if (!paused) {
        idx += speed * speed_direction;
    }
    plot_heatmap_legend();
}

function decrease_pixel() {
    first_idx = max(0, idx-speed);
    for (let j = idx-1; j >= first_idx; j--) {
        undraw_config(submission[j]);
    }
    idx = first_idx;
    update_pixel_info(first_idx);
}

function increase_pixel() {
    last_idx = min(submission.length-1, idx+speed-1);
    for (let j = idx; j <= last_idx; j++) {
        draw_config(submission[j]);
    }
    idx = last_idx+1;

    update_pixel_info(last_idx);
}

function update_pixel_info(pixel_idx) {
    document.getElementById("current_pixel").textContent = pixel_idx;
    document.getElementById("current_pixel").textContent = pixel_idx;
    document.getElementById("pixel").value = pixel_idx;

    draw_arm(submission[pixel_idx]);
}

function update_fps() {
    fps = int(document.getElementById("fps").value);
    document.getElementById("current_fps").textContent = fps;
    frameRate(fps);
}

function increase_fps() {
    fps += 1;
    document.getElementById("fps").value = fps;
    update_fps();
}

function decrease_fps() {
    if (fps == 1) {
        return;
    }
    fps -= 1;
    document.getElementById("fps").value = fps;
    update_fps();
}

function update_speed() {
    speed = int(document.getElementById("speed").value);
    document.getElementById("current_speed").textContent = speed;
    document.getElementById("decrease_pixel").value = "-" + speed;
    document.getElementById("increase_pixel").value = "+" + speed;
}

function set_speed(s) {
    speed = s;
    document.getElementById("speed").value = speed;
    update_speed();
}

function increase_speed() {
    speed += 1;
    document.getElementById("speed").value = speed;
    update_speed();
}

function decrease_speed() {
    if (speed == 1) {
        return;
    }
    speed -= 1;
    document.getElementById("speed").value = speed;
    update_speed();
}

function reset() {
    if (idx == 0) {
        return;
    }
    idx = 0;
    reset_canvases();
}

let fileInput = document.getElementById("csv");

fileInput.addEventListener('change', () => {
    const objectURL = window.URL.createObjectURL(fileInput.files[0]);
    load_submission(objectURL);
});

function mouseWheel(event) {
    if (mouseX < 0 ||  mouseX > w || mouseY < 0 || mouseY > h)
        return;

    zoom_factor = sf / 10;
    zoom = zoom_factor * (event.delta > 0 ? -1 : 1);

    const wx = (mouseX - x_shift) / (width * sf);
    const wy = (mouseY - y_shift) / (height * sf);

    x_shift -= wx * width * zoom;
    y_shift -= wy * height * zoom;
    sf += zoom;
}

function mouseDragged(event) {
    if (mouseX < 0 ||  mouseX > w || mouseY < 0 || mouseY > h)
    return;
    x_shift += event.movementX;
    y_shift += event.movementY;
}


document.getElementById("fps").value = fps;
document.getElementById("current_fps").textContent = fps;

document.getElementById("speed").value = speed;
document.getElementById("current_speed").textContent = speed;

document.getElementById("decrease_pixel").value = "-" + speed;
document.getElementById("increase_pixel").value = "+" + speed;

function clear_solution() {
    select("#solution").html("");
}

function clip_solution() {
    navigator.clipboard.writeText(select("#solution").value());
}

function export_solution() {
    let data = "configuration\n" + select("#solution").value();
    const link = document.createElement("a");
    const file = new Blob([data], { type: 'text/plain' });
    link.href = URL.createObjectURL(file);
    link.download = "submission.csv";
    link.click();
    URL.revokeObjectURL(link.href);
}
