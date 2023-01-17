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
let path_canvas;
let arm_canvas;
let text_canvas;
let config_canvas;
let cost_canvas;
let scaling_factor = 5;
let config_map;
let xy_cost_map;
let i_cost;
let cum_cost;
let trace_config = false;
let new_config = true;
let paused = false;
let last_idx=0;
let min_idx=1000000;
let max_idx=1000000;
let loop = false;
let plot_cost = false;
let plot_path = true;
let path_x = 128;
let path_y = 128;
let min_cost = 1;
let max_cost = 4;
let path_color;

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
        cum_cost = {};
        i_cost = {};
        xy_cost_map = {};
        for (let x=-128; x <= 128; x++) {
            for (let y=-128; y <= 128; y++) {
                xy_cost_map["(" + x + "," + y + ")"] = 0;
            }
        }
        let total_cost = 0;
        for (let idx = 0; idx < table.rows.length; idx++)
        {
            let config_arr = table.rows[idx].arr[0].split(";").map(cell => (cell.split(" ").map(x => int(x))));
            submission.push(config_arr);
            [x_config, y_config] = config_to_cartesian(config_arr);
            x_config -= 128;
            y_config = 128 - y_config;
            let xy_key = "(" + x_config + "," + y_config + ")";
            let cost = 0;
            if (idx > 0) {
                cost = get_cost(submission[idx-1], submission[idx]);
            }
            total_cost += cost;
            i_cost[idx] = cost;
            xy_cost_map[xy_key] += cost;
            cum_cost[idx] = total_cost;
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
    path_canvas.clear();
    arm_canvas.clear();
    text_canvas.clear();
    config_canvas.clear();
    cost_canvas.clear();

    image_canvas.noStroke();
    cost_canvas.noStroke();
    config_canvas.noStroke();
    image_canvas.fill(255);
    cost_canvas.fill(255);
    image_canvas.square(-1,-1, scaling_factor*257);
    cost_canvas.square(-1,-1, scaling_factor*257);
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
        [x_div_config, y_div_config] = config_to_cartesian(div_config);
        scaled_plot(config_canvas, x_div_config, y_div_config, color('magenta'));
    }

    if (new_config) {
        // 64 0;-32 0;-16 0;-8 0;-4 0;-2 0;-1 0;-1 0
        config_str = div_config.map((xy)=>{return xy.join(" ");}).join(";");
        select("#solution").html(config_str + "\n", true);
        document.getElementById("solution").scrollTop = document.getElementById("solution").scrollHeight;
        new_config = false;
    }
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
    path_canvas = createGraphics(scaling_factor*257, scaling_factor*257);
    arm_canvas = createGraphics(scaling_factor*257, scaling_factor*257);
    text_canvas = createGraphics(scaling_factor*500, scaling_factor*500);
    config_canvas = createGraphics(scaling_factor*257, scaling_factor*257);
    cost_canvas = createGraphics(scaling_factor*257, scaling_factor*257);

    image_canvas.parent("canvas");
    path_canvas.parent("canvas");
    arm_canvas.parent("canvas");
    text_canvas.parent("canvas");
    config_canvas.parent("canvas");
    cost_canvas.parent("canvas");

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
    path_color = color("#ff00ff");
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
        x += config[j][0];
        y -= config[j][1];
    }
    return [x, y]
}

function get_image_rgb(x, y) {
    [_, _, r, g, b] = image_csv.rows[257 * y + x].arr;
    return [r, g, b]
}

function get_cost(config1, config2) {
    [x_config1, y_config1] = config_to_cartesian(config1);
    [x_config2, y_config2] = config_to_cartesian(config2);
    [_, _, r1, g1, b1] = image_csv.rows[257 * y_config1 + x_config1].arr;
    [_, _, r2, g2, b2] = image_csv.rows[257 * y_config2 + x_config2].arr;

    let cost = 0;
    for (let i=0; i<config1.length; i++) {
        if ((config1[i][0] != config2[i][0]) || (config1[i][1] != config2[i][1])) {
            cost += 1;
        }
    }
    cost = Math.sqrt(cost);
    cost += Math.abs(r2-r1) + Math.abs(g2-g1) + Math.abs(b2-b1);
    return cost
}

function plot_heatmap_legend() {
    let cost = min_cost;
    let i = 1;
    let step = 0.1;
    strokeCap(SQUARE);
    let linewidth = 2 * scaling_factor;
    let legend_x0 = 260;
    let legend_y0 = 5;
    let legend_w = 5;
    while (cost <= max_cost + step) {
        strokeWeight(linewidth);
        stroke(heatmap_color(1, 3, cost));
        line(
            legend_x0 * scaling_factor,
            legend_y0 * scaling_factor + i * linewidth,
            (legend_x0 + legend_w) * scaling_factor,
            legend_y0 * scaling_factor + i * linewidth
        );
        stroke(0);
        strokeWeight(1);
        if (int(cost * 10) % 10 == 0) {
            text(
                int(cost),
                (legend_x0 + legend_w + 1) * scaling_factor,
                legend_y0 * scaling_factor + i * linewidth + 6,
            );
        }

        i += 1;
        cost += step;
    }
    stroke(0);
    strokeWeight(1);
    text("Pixel Cost", legend_x0 * scaling_factor, 10)
}

function heatmap_color(minimum, maximum, value) {
    let badness_ratio = (value-minimum) / (maximum - minimum);
    // good
    // 1: 252 214 218 -> 3: 243 34 5
    // let best_color = color("#fcd6da");
    // let worst_color = color("#f32205");
    let r = 252 + (243-252) * badness_ratio;
    let g = 214 + (34-214) * badness_ratio;
    let b = 218 + (5-218) * badness_ratio;

    return color(r, g, b);
}

function draw_config(config) {
    let x_config;
    let y_config;
    [x_config, y_config] = config_to_cartesian(config);

    [_, _, r, g, b] = image_csv.rows[257 * y_config + x_config].arr;
    scaled_plot(image_canvas, x_config, y_config, color(r * 255, g * 255, b * 255));

    path_canvas.stroke(path_color);
    path_canvas.strokeWeight(1);
    path_canvas.line(
        scaling_factor * path_x + scaling_factor / 2,
        scaling_factor * path_y + scaling_factor / 2,
        scaling_factor * x_config + scaling_factor / 2,
        scaling_factor * y_config + scaling_factor / 2
    );
    path_x = x_config;
    path_y = y_config;
}

function scaled_plot(canvas, x, y, color) {
    canvas.fill(color);
    canvas.square(scaling_factor * x, scaling_factor * y, scaling_factor);
}

function undraw_config(config) {
    let x_config;
    let y_config;
    [x_config, y_config] = config_to_cartesian(config);

    scaled_plot(image_canvas, x_config, y_config, color("white"));
}

function draw_arm(config) {
    let x = 128;
    let y = 128;
    let arm_pts = [[x,y]]
    for (let j = 0; j < config.length; j++) {
        x += int(config[j][0]);
        y -= int(config[j][1]);
        arm_pts.push([x,y]);
    }
    arm_canvas.clear();
    arm_canvas.strokeWeight(1/sf);
    for (let j = 1; j < arm_pts.length; j++) {
        arm_canvas.stroke(arm_colors[j - 1]);
        arm_canvas.line(scaling_factor * arm_pts[j - 1][0], scaling_factor * arm_pts[j - 1][1], scaling_factor * arm_pts[j][0], scaling_factor * arm_pts[j][1]);
    }
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
    text_size = max(12, 16 / sf);
    text_canvas.textSize(text_size);
    text_canvas.strokeWeight(1 / sf);
    text_canvas.noStroke();

    let x = Math.trunc((mouseX - x_shift) / sf / scaling_factor);
    let y = Math.trunc((mouseY - y_shift) / sf / scaling_factor);
    text_canvas.clear();
    if (x >= 0 && x < 257 && y >= 0 && y < 257) {
        noCursor();
        text_canvas.stroke(1);
        [r, g, b] = get_image_rgb(x, y);
        let pixel_str = "(" + (x - 128) + ", " + (128 - y) + ")";
        scaled_plot(text_canvas, x, y, color("black"));

        let text_x, text_y;
        text_x = (x + 2) * scaling_factor;
        text_y = (y+3) * scaling_factor;

        let y_offset = text_size * 1.5 ;
        text_canvas.stroke("red");
        text_canvas.fill("red");
        text_canvas.text(Math.round(r * 100) / 100, text_x, text_y);
        text_y += y_offset;
        text_canvas.stroke("green");
        text_canvas.fill("green");
        text_canvas.text(Math.round(g * 100) / 100, text_x, text_y);
        text_y += y_offset;
        text_canvas.stroke("blue");
        text_canvas.fill("blue");
        text_canvas.text(Math.round(b * 100) / 100, text_x, text_y);
        text_y += y_offset;
        text_canvas.stroke("black");
        text_canvas.fill("black");
        text_canvas.text(pixel_str, text_x, text_y);
        text_y += y_offset;

        let config_key = "(" + (x - 128) + "," + (128 - y) + ")";
        if (config_key in config_map) {
            for (const i of config_map[config_key]) {
                config_str = i + ": " + submission[i] + " (" + Math.round(i_cost[i] * 100) / 100 + ")";
                text_canvas.text(config_str, text_x, text_y);
                text_y += y_offset;
            }
        }
    }
    else {
        cursor();
    }
}


function draw() {
    translate(x_shift, y_shift);
    scale(sf);
    background(220);

    loop = document.getElementById("loop").checked;
    plot_path = document.getElementById("plot_path").checked;
    plot_cost = document.getElementById("plot_heatmap").checked;
    if (document.getElementById("speed_reverse").checked) {
        speed_direction = -1;
    } else {
        speed_direction = 1;
    }

    min_idx =  int(select("#min_idx").value());
    max_idx =  int(select("#max_idx").value());
    if (isNaN(idx) || idx < min_idx) {
        idx = min_idx;
    }
    if (loop && idx > max_idx) {
        idx = min_idx;
        reset_canvases();
    }

    if (submission && !paused && min_idx < idx && idx < max_idx) {
        if (speed_direction > 0) {
            last_idx = min(idx+speed-1, submission.length-1);
            for (let j = idx; j <= last_idx; j++) {
                draw_config(submission[j]);
                [x_config, y_config] = config_to_cartesian(submission[j]);
                let xy_key = "(" + (x_config-128) + "," + (128-y_config) + ")";
                scaled_plot(cost_canvas, x_config, y_config, heatmap_color(1, 4, xy_cost_map[xy_key]));
            }
        } else {
            last_idx = max(0, idx + speed_direction * speed);
            for (let j = idx; j > last_idx; j--) {
                undraw_config(submission[j]);
            }
        }
        update_pixel_info(last_idx);
    }
    write_div_config();
    draw_textbox();

    // All image setting should be centralized here.
    if (!plot_cost) {
        image(image_canvas, 0, 0);
    } else {
        image(cost_canvas, 0, 0);
    }
    if (plot_path) {
        image(path_canvas, 0, 0);
    }
    image(arm_canvas, 0, 0);
    image(config_canvas, 0, 0);

    image(text_canvas, 0, 0);

    if (!paused && idx <= max_idx) {
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
    console.log("Reset");
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

function mouseClick(event) {

}

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
