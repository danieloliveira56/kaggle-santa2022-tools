let idx = 0;
let submission;
let image_csv;
let previous_config;
let scaling_factor = 3;
let fps = 60;
let ppf = 10;
let speed = 10;
let previous_r;
let previous_g;
let previous_b;
let previous_pixels;
let arm_colors;
let paused;
let image_canvas;

function preload() {
    loadTable('image.csv', 'csv', 'header', (table) => {
        image_csv = table;
    });
    load_submission('submission82425.csv');
}

function load_submission(submission_file) {
    loadTable(submission_file, 'csv', 'header', (table) => {
        submission = [];
        for (let idx = 0; idx < table.rows.length; idx++)
        {
            submission.push(table.rows[idx].arr[0].split(";"));
        }
        reset();
    });
}

function setup() {
    var plot = createCanvas(257 * scaling_factor, 257 * scaling_factor);
    image_canvas = createGraphics(257 * scaling_factor, 257 * scaling_factor);
    arm_canvas = createGraphics(257 * scaling_factor, 257 * scaling_factor);
    text_canvas = createGraphics(257 * scaling_factor, 257 * scaling_factor);

    plot.parent("canvas");
    image_canvas.parent("canvas");
    arm_canvas.parent("canvas");
    text_canvas.parent("canvas");
    text_canvas.textSize(28);
    background(220);
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


function get_image_rgb(x, y) {
    [_, _, r, g, b] = image_csv.rows[257 * y + x].arr;
    return [r, g, b]
}

function draw_config(config) {
    let x_config;
    let y_config;
    [x_config, y_config] = config_to_cartesian(config);

    [_, _, r, g, b] = image_csv.rows[257 * y_config + x_config].arr;
    scaled_plot(x_config, y_config, r * 255, g * 255, b * 255);
}

function undraw_config(config) {
    let x_config;
    let y_config;
    [x_config, y_config] = config_to_cartesian(config);

    scaled_plot(x_config, y_config);
}

function scaled_plot(x, y, r=222, g=222, b=222) {
    let c = color(r, g, b);
    image_canvas.stroke(c);
    for (let scaled_x = scaling_factor * x; scaled_x < scaling_factor * x + scaling_factor; scaled_x++) {
        for (let scaled_y = scaling_factor * y; scaled_y < scaling_factor * y + scaling_factor; scaled_y++) {
            image_canvas.point(scaled_x, scaled_y);
        }
    }
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
    arm_canvas.strokeWeight(1/scaling_factor);
    arm_canvas.scale(scaling_factor);
    for (let j = 1; j < arm_pts.length; j++) {
        arm_canvas.stroke(arm_colors[j - 1]);
        arm_canvas.line(arm_pts[j - 1][0], arm_pts[j - 1][1], arm_pts[j][0], arm_pts[j][1]);
    }
    arm_canvas.scale(1/scaling_factor);

    image(arm_canvas, 0, 0);
}

function draw_textbox() {
    let x = Math.trunc(mouseX / scaling_factor);
    let y = Math.trunc(mouseY / scaling_factor);
    text_canvas.clear();
    if (mouseX > 0 &&  mouseX < width && mouseY > 0 && mouseY < height) {
        [r, g, b] = get_image_rgb(x, y);
        let pixel_str = "(" + x + ", " + y + ", " + Math.round(r * 100) / 100 + ", " + Math.round(g * 100) / 100 + ", " + Math.round(b * 100) / 100 + ")";
        let text_x = min(x*scaling_factor+scaling_factor, 257 * scaling_factor - text_canvas.textWidth(pixel_str));
        let text_y = max(y*scaling_factor, 12);
        text_canvas.fill(0);
        text_canvas.text(pixel_str, text_x, text_y);
        noCursor();
        text_canvas.noFill();
        text_canvas.square(x*scaling_factor, y*scaling_factor, scaling_factor);
    }
}


function draw() {
    background(220);
    draw_textbox();


    if (!submission || paused || idx >= submission.length) {
        image(image_canvas, 0, 0);
        image(arm_canvas, 0, 0);
        image(text_canvas, 0, 0);
        return;
    }

    let last_idx = min(idx+speed-1, submission.length-1);
    for (let j = idx; j <= last_idx; j++) {
        draw_config(submission[j]);
    }
    image(image_canvas, 0, 0);

    post_pixel_drawing(last_idx);

    image(text_canvas, 0, 0);

    idx += speed;
}

function rescale() {
    scaling_factor = int(document.getElementById("scaling_factor").value);
    document.getElementById("current_scale").textContent = scaling_factor;
    resizeCanvas(257 * scaling_factor, 257 * scaling_factor);
    image_canvas.resizeCanvas(257 * scaling_factor, 257 * scaling_factor);
    arm_canvas.resizeCanvas(257 * scaling_factor, 257 * scaling_factor);
    text_canvas.resizeCanvas(257 * scaling_factor, 257 * scaling_factor);
    reset();
}

function increase_scale() {
    scaling_factor += 1;
    document.getElementById("scaling_factor").value = scaling_factor;
    document.getElementById("current_scale").textContent = scaling_factor;
    rescale();
}

function decrease_scale() {
    if (scaling_factor == 1) {
        return;
    }
    scaling_factor -= 1;
    document.getElementById("scaling_factor").value = scaling_factor;
    document.getElementById("current_scale").textContent = scaling_factor;
    rescale();
}

function decrease_pixel() {
    console.log(idx);
    first_idx = max(0, idx-speed);
    for (let j = idx-1; j >= first_idx; j--) {
        undraw_config(submission[j]);
    }
    idx = first_idx;
    post_pixel_drawing(first_idx);
}

function increase_pixel() {
    console.log(idx);
    last_idx = min(submission.length-1, idx+speed-1);
    for (let j = idx; j <= last_idx; j++) {
        draw_config(submission[j]);
    }
    idx = last_idx+1;

    post_pixel_drawing(last_idx);
}

function post_pixel_drawing(pixel_idx) {
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
    background(220);
    image_canvas.clear();
    arm_canvas.clear();
    text_canvas.clear();
}

let fileInput = document.getElementById("csv");

fileInput.addEventListener('change', () => {
    const objectURL = window.URL.createObjectURL(fileInput.files[0]);
    load_submission(objectURL);
});

document.getElementById("scaling_factor").value = scaling_factor;
document.getElementById("current_scale").textContent = scaling_factor;

document.getElementById("fps").value = fps;
document.getElementById("current_fps").textContent = fps;

document.getElementById("speed").value = speed;
document.getElementById("current_speed").textContent = speed;

document.getElementById("decrease_pixel").value = "-" + speed;
document.getElementById("increase_pixel").value = "+" + speed;

