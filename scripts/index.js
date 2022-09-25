const path = new Path(); // robot path
let debugPath = [];


// program mode.
// 0 = create
// 1 = debug
let mode = 0;

// initialize path inputs
let mousePos;
let controlPointHold = false;
let controlPointSpline = 0;
let controlPointNumber = 0;


/**
 * @brief convert an HSl color code to Hex
 * @param {number} h - the hue
 * @param {number} s - the saturation
 * @param {number} l - the lightness
 * @return {string} - the hex color code
 */
function hslToHex(h, s, l) {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}


/**
 * @brief function that gets user input
 */
function getInput() {
  lookahead = lookaheadSlider.value;
  decel = decelSlider.value; // inches/s/s
  maxSpeed = maxSpeedSlider.value;
  precision = precisionSlider.value;
  curvatureMultiplier = (curveMultiplierSlider.value * precision)/100;
  inchesPerPoint = inchesPerPointSlider.value;
  trackWidth = trackWidthSlider.value;
  deactivateDist = deactivateDistSlider.value;

  // update PID constants
  lF = lFSlider.value;
  lA = lASlider.value;
  lJ = lJSlider.value;
  lP = lPSlider.value;
  lI = lISlider.value;
  lD = lDSlider.value;
  lB = lBSlider.value;
  lG = lGSlider.value;

  rF = rFSlider.value;
  rA = rASlider.value;
  rJ = rJSlider.value;
  rP = rPSlider.value;
  rI = rISlider.value;
  rD = rDSlider.value;
  rB = rBSlider.value;
  rG = rGSlider.value;
};


/**
 * @brief draw the spline
 */
function render() {
  // clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // draw the field
  ctx.drawImage(img, 0, 0, img.width, img.height, // source rectangle
      0, 0, canvas.width, canvas.height); // destination rectangle

  // create mode render
  if (mode == 0) {
    // init
    getInput();
    const finalSpacing = Math.round(path.length / inchesPerPoint);
    path.genPoints(precision, finalSpacing);

    // draw control points
    for (let i = 0; i < path.splines.length; i++) {
      const p1 = coordToPx(path.splines[i].p1);
      const p2 = coordToPx(path.splines[i].p2);
      const p3 = coordToPx(path.splines[i].p3);
      const p4 = coordToPx(path.splines[i].p4);
      ctx.fillStyle = hslToHex(140, 50, 50);
      ctx.strokeStyle = hslToHex(0, 0, 0);
      // draw the lines between the control points
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      ctx.closePath();
      ctx.beginPath();
      ctx.moveTo(p3.x, p3.y);
      ctx.lineTo(p4.x, p4.y);
      ctx.stroke();
      ctx.closePath();
      // draw the control points
      ctx.beginPath();
      ctx.arc(p1.x, p1.y, controlPointRadius*imgPixelsPerInch, 0, 2*Math.PI);
      ctx.arc(p2.x, p2.y, controlPointRadius*imgPixelsPerInch, 0, 2*Math.PI);
      ctx.fill();
      ctx.closePath();
      ctx.beginPath();
      ctx.arc(p3.x, p3.y, controlPointRadius*imgPixelsPerInch, 0, 2*Math.PI);
      ctx.arc(p4.x, p4.y, controlPointRadius*imgPixelsPerInch, 0, 2*Math.PI);
      ctx.fill();
      ctx.closePath();
    }

    // draw spline
    for (let i = 0; i < path.points2.length; i++) {
      const p1 = coordToPx(path.points2[i]);
      // draw the points
      const radiusSetting = 0.5;
      const radius = radiusSetting * imgPixelsPerInch;
      ctx.fillStyle = hslToHex((path.points2[i].velocity/maxSpeed)*180,
          100, 50);
      ctx.strokeStyle = ctx.fillStyle;
      ctx.beginPath();
      ctx.arc(p1.x, p1.y, radius, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.fill();
      ctx.closePath();
      // draw the lines
      if (i < path.points2.length - 1) {
        const p2 = coordToPx(path.points2[i + 1]);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        ctx.closePath();
      }
    }
  }
};
