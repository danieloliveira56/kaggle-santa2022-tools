let idx = 0;
let submission;
let image_csv;
let previous_config;
let scaling_factor = 2;
let previous_r;
let previous_g;
let previous_b;
let previous_pixels;
let paused;
let image_canvas;
let mouse_dragging = false;
let color_ranges = {
    'r': {'min': 0, 'max': 1},
    'g': {'min': 0, 'max': 1},
    'b': {'min': 0, 'max': 1},
};
let include_colors = {
    'r': true,
    'g': true,
    'b': true,
};

function preload() {
    loadTable('image.csv', 'csv', 'header', (table) => {
        image_csv = table;
    });
}

function setup() {
    var plot = createCanvas(257 * scaling_factor, 257 * scaling_factor);
    image_canvas = createGraphics(257 * scaling_factor, 257 * scaling_factor);
    text_canvas = createGraphics(257 * scaling_factor, 257 * scaling_factor);

    plot.parent("canvas");
    image_canvas.parent("canvas");
    text_canvas.parent("canvas");
    text_canvas.textSize(28);
    background(220);
    draw_image();
    update_ranges();
}

function get_image_rgb(x, y) {
    [_, _, r, g, b] = image_csv.rows[257 * y + x].arr;
    return {'r': r, 'g': g, 'b': b}
}

function draw_image() {
    image_canvas.clear();
    for (let y=0; y < 257; y++) {
        for (let x=0; x < 257; x++) {
            let rgb = get_image_rgb(x, y);
            let draw_pixel = true;
            for (c in rgb) {
                if ((rgb[c] < color_ranges[c]['min']) || (color_ranges[c]['max'] < rgb[c])) {
                    if (include_colors[c]) {draw_pixel=false;}
                }
                else if (!include_colors[c]) {
                    draw_pixel = false;
                }
            }
            if (!draw_pixel) continue;
            scaled_plot(x, y, r * 255, g * 255, b * 255);
        }
    }
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

function draw_textbox() {
    let x = Math.trunc(mouseX / scaling_factor);
    let y = Math.trunc(mouseY / scaling_factor);
    text_canvas.clear();
    if (mouseX > 0 &&  mouseX < width && mouseY > 0 && mouseY < height) {
        let rgb = get_image_rgb(x, y);
        let pixel_str = "(" + x + ", " + y + ", " + Math.round(rgb['r'] * 100) / 100 + ", " + Math.round(rgb['g'] * 100) / 100 + ", " + Math.round(rgb['b'] * 100) / 100 + ")";
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
    if (!image_csv) {
        return;
    }
    background(220);
    draw_textbox();

    image(image_canvas, 0, 0);
    image(text_canvas, 0, 0);

    if ((mouse_dragging) && ( (mouseX < 0 ||  mouseX > width || mouseY < 0 || mouseY > height) )) {
        mouse_dragging = false;
    }
    if (mouseIsPressed && mouse_dragging) {
        let x = Math.trunc(mouseX / scaling_factor);
        let y = Math.trunc(mouseY / scaling_factor);

        let rgb = get_image_rgb(x, y);
        for (c in rgb) {
            color_ranges[c]['min'] = min(color_ranges[c]['min'], rgb[c]);
            color_ranges[c]['max'] = max(color_ranges[c]['max'], rgb[c]);
        }
        update_ranges();
    }
}

function rescale() {
    scaling_factor = int(document.getElementById("scaling_factor").value);
    document.getElementById("current_scale").textContent = scaling_factor;
    resizeCanvas(257 * scaling_factor, 257 * scaling_factor);
    image_canvas.resizeCanvas(257 * scaling_factor, 257 * scaling_factor);
    text_canvas.resizeCanvas(257 * scaling_factor, 257 * scaling_factor);
    draw_image();
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


function change_color(c, m, change) {
    if (color_ranges[c][m] + float(change) < 0 || color_ranges[c][m] + float(change) > 1)
    {
        return;
    }
    color_ranges[c][m] += float(change);
    document.getElementById(c + m).value = color_ranges[c][m];
    document.getElementById(c).textContent = "(" + color_ranges[c]['min'].toFixed(3) + ", " + color_ranges[c]['max'].toFixed(3) + ")";
    draw_image();
}

function update_ranges() {
    for (c in color_ranges) {
        document.getElementById(c + "min").value = color_ranges[c]['min'];
        document.getElementById(c + "max").value = color_ranges[c]['max'];
        document.getElementById(c).textContent = "(" + color_ranges[c]['min'].toFixed(3) + ", " + color_ranges[c]['max'].toFixed(3) + ")";
    }
    draw_image();
}

function read_ranges() {
    for (c in color_ranges) {
        color_ranges[c]['min'] = float(document.getElementById(c + "min").value);
        color_ranges[c]['max'] = float(document.getElementById(c + "max").value);
    }
    update_ranges();
}

function update_range_text(c, m, val) {
    color_ranges[c][m] = float(val);
    document.getElementById(c).textContent = "(" + color_ranges[c]['min'].toFixed(3) + ", " + color_ranges[c]['max'].toFixed(3) + ")";
}


function flip_color(c) {
    include_colors[c] = !include_colors[c];
    btn = document.getElementById(c + "include");
    btn.classList.toggle('btn-danger');
    btn.classList.toggle('btn-success');
    if (include_colors[c]) {
        btn.textContent = "Include";
    } else {
        btn.textContent = "Exclude";
    }
    draw_image();
}

function mousePressed() {
    if (mouseX > 0 &&  mouseX < width && mouseY > 0 && mouseY < height) {
        mouse_dragging = true;
        let x = Math.trunc(mouseX / scaling_factor);
        let y = Math.trunc(mouseY / scaling_factor);

        let rgb = get_image_rgb(x, y);
        for (c in rgb) {
            color_ranges[c]['min'] = rgb[c];
            color_ranges[c]['max'] = rgb[c];
        }
    }
}

function mouseReleased() {
    if (mouse_dragging && mouseX > 0 &&  mouseX < width && mouseY > 0 && mouseY < height) {
        mouse_dragging = false;
        update_ranges();
    }
}

function reset() {
    color_ranges = {
        'r': {'min': 0, 'max': 1},
        'g': {'min': 0, 'max': 1},
        'b': {'min': 0, 'max': 1},
    };
    update_ranges();
    paused=false;
}

function keyPressed() {
  if (keyCode === ESCAPE) {
    reset();
  }
}

document.getElementById("scaling_factor").value = scaling_factor;
document.getElementById("current_scale").textContent = scaling_factor;
