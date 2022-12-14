/* eslint-disable no-unused-vars */

/**
 * @brief spline class
 */
class Spline {
  /**
   * Constructor for spline
   * @param {Point} p1 - start point
   * @param {Point} p2 - control point 1
   * @param {Point} p3 - control point 2
   * @param {Point} p4 - end point
   */
  constructor(p1, p2, p3, p4) {
    this.p1 = p1;
    this.p2 = p2;
    this.p3 = p3;
    this.p4 = p4;
  };


  /**
   * @brief get the position of the spline at a certain time
   * @param {number} t - the time
   * @return {Point} - the position of the spline at the time
   */
  getPosition(t) {
    const x = (1-t)**3*this.p1.x + 3*t*(1-t)**2*this.p2.x +
              3*t**2*(1-t)*this.p3.x + t**3*this.p4.x;
    const y = (1-t)**3*this.p1.y + 3*t*(1-t)**2*this.p2.y +
              3*t**2*(1-t)*this.p3.y + t**3*this.p4.y;
    return new Point(x, y);
  };


  /**
   * @brief generate points on the spline with a specific tolerance
   * @param {number} tolerance - the tolerance. How many points to generate
   * @param {number} first - if the spline is the first on the path
   */
  generatePoints(tolerance, first) {
    const adjustedTolerance = tolerance - 1;
    this.points = [];
    const newTolerance = 1 / adjustedTolerance;
    for (let t = 0; t <= adjustedTolerance; t++) {
      this.points.push(this.getPosition(t/adjustedTolerance));
    }
    if (!first) {
      this.points.shift();
    }
  };


  /**
   * @brief get the length of the spline
   */
  genLength() {
    this.len = 0;

    for (let i = 0; i < this.points.len - 1; i++) {
      const v = new Vector(this.points[i], this.points[i+1]);
      this.len += v.getMagnitude();
    }
  };
};


/**
 * @brief calculate the curvature of 3 points
 * @param {Point} p1 - the first point
 * @param {Point} p2 - the second point
 * @param {Point} p3 - the third point
 * @return {number} - the curvature
 */
function calcCurvature(p1, p2, p3) {
  // set values of points
  let x1 = p1.x;
  // fix x1 = x2 edge case
  if (x1 == p2.x) {
    x1 += 0.00001;
  }
  const x2 = p2.x;
  const x3 = p3.x;
  const y1 = p1.y;
  const y2 = p2.y;
  const y3 = p3.y;

  // variables used to make the math look sane
  const k1 = 0.5 * (x1**2 + y1**2 - x2**2 - y2**2) / (x1 - x2);
  const k2 = 0.5 * (y1 - y2) / (x1 - x2);
  const bA = x2**2 - 2*x2*k1 + y2**2 - x3**2 + 2*x3*k1 - y3**2;
  const bB = x3*k2 - y3 + y2 - x2*k2;

  // useful variables
  const b = 0.5 * bA / bB; // circle center y
  const a = k1 - k2*b; // circle center x
  const r = Math.sqrt((x1 - a)**2 + (y1 - b)**2); // radius of the circle
  const curvature = 1 / r; // curvature of the circle

  // fix NaN curvature
  if (isNaN(curvature)) {
    return 0;
  }

  return curvature;
};


/**
 * @brief Class for the robot path. Contains multiple splines
 */
class Path {
  /**
   * @brief Constructor for path
   */
  constructor() {
    this.splines = [];
  };


  /**
   * @brief add a spline to the path
   * @param {Spline} spline - the spline to add
   */
  addSpline(spline) {
    this.splines.push(spline);
  };


  /**
   * @brief calculate the distance of the path
   */
  genLength() {
    // calculate the distance from the start of the spline to each point
    for (let i = 0; i < this.points.length; i++) {
      if (i == 0) {
        this.points[i].distance = 0;
      } else {
        const v = new Vector(this.points[i-1], this.points[i]);
        this.points[i].distance = this.points[i-1].distance + v.getMagnitude();
      }
    }
    // save the length of the spline
    this.length = this.points[this.points.length - 1].distance;
  };


  /**
   * @brief generate velocities for each point
   */
  genVelocities() {
    // generate velocities
    for (let i = 0; i < this.points.length-1; i++) {
      const p1 = this.points[i];
      const p2 = this.points[i+1];

      const v = new Vector(p1, p2);
      const vel = Math.min(maxSpeed, curvatureMultiplier*v.getMagnitude());
      this.points[i].velocity = vel;

      if (i == this.points.length - 2) {
        this.points[i+1].velocity = vel;
      }
    }

    // apply deceleration
    this.points[this.points.length - 1].velocity = 0;
    for (let i = this.points.length-1; i > 0; i--) { // loop from end to start
      const p0 = this.points[i];
      const p1 = this.points[i-1];

      const v = new Vector(p0, p1);
      const vel = Math.sqrt(p0.velocity**2 + 2*decel*v.getMagnitude());
      this.points[i-1].velocity = Math.min(vel, p1.velocity);
    }
  };


  /**
   * @brief generate equally spaced points
   * @param {number} spacing the number of points on the curve
   */
  genSpacedPoints(spacing) {
    // init points2
    this.points2 = [];
    // space out the points on the curve
    const newSpacing = 1/(spacing-1);
    // map T onto t
    for (let T = 0; T < 1.00001; T += newSpacing) {
      const u = T * this.length;
      let closestIndex = 0;
      // find the largest point with a distance less than or equal to u
      // this should be done with binary search
      for (let i = 0; i < this.points.length; i++) {
        if (this.points[i].distance <= u) {
          if (this.points[i].distance > this.points[closestIndex].distance) {
            closestIndex = i;
          }
        }
      }
      // if the point we found is an exact match, we can just save it
      if (this.points[closestIndex].distance == u) {
        this.points2.push(this.points[closestIndex]);
        this.points2[this.points2.length - 1].distance = u;
      } else if (closestIndex == this.points.length - 1) {
        this.points2.push(this.points[closestIndex]);
        this.points2[this.points2.length - 1].distance = u;
      // otherwise we need to interpolate (99.99% of cases)
      } else {
        const p1 = this.points[closestIndex];
        const p2 = this.points[closestIndex + 1];
        const v = new Vector(p1, p2);
        const p3 = v.interpolate(u - p1.distance);
        // decide what the velocity should be
        if ((u - p1.distance) > v.getMagnitude()/2) {
          p3.velocity = p2.velocity;
        } else {
          p3.velocity = p1.velocity;
        }
        this.points2.push(p3);
        this.points2[this.points2.length - 1].distance = u;
      }
    }
  };


  /**
   * @brief generate points on all splines with a specific tolerance
   * @param {number} tolerance - how many points to generate per spline
   * @param {number} spacing - the distance between points
   * WARNING: this function is computationally expensive
   * In future this should be GPU accelerated
   */
  genPoints(tolerance, spacing) {
    // generate points on all splines
    for (let i = 0; i < this.splines.length; i++) {
      if (i == 0) {
        this.splines[i].generatePoints(tolerance, true);
      } else {
        this.splines[i].generatePoints(tolerance, false);
      }
    }

    // combine all the splines into 1 array
    this.points = [];
    for (let i = 0; i < this.splines.length; i++) {
      this.points = this.points.concat(this.splines[i].points);
    }

    // generate points on the path
    this.genLength();
    this.genVelocities();
    this.genSpacedPoints(spacing);
  };
};


/**
 * @brief debugDataPoint class
 */
class DebugDataPoint {
  /**
   * @brief constructor for debugDataPoint
   * @param {number} timestamp - the timestamp of the data point
   * @param {number} rbtX - the x position of the robot
   * @param {number} rbtY - the y position of the robot
   * @param {number} rbtH - the heading of the robot
   * @param {number} closestX - the x position of the closest point
   * @param {number} closestY - the y position of the closest point
   * @param {number} lookaheadX - the x position of the lookahead point
   * @param {number} lookaheadY - the y position of the lookahead point
   * @param {number} curvature - the curvature of the robot
   * @param {number} targetVel - the target velocity of the robot
   * @param {number} leftTargetVel - the target velocity of the left wheel
   * @param {number} rightTargetVel - the target velocity of the right wheel
   * @param {number} leftVel - the velocity of the left wheel
   * @param {number} rightVel - the velocity of the right wheel
   */
  constructor(timestamp, rbtX, rbtY, rbtH, closestX, closestY, lookaheadX,
      lookaheadY, curvature, targetVel, leftTargetVel, rightTargetVel,
      leftVel, rightVel) {
    this.timestamp = timestamp;
    this.x = rbtX;
    this.y = rbtY;
    this.heading = rbtH;
    this.closestX = closestX;
    this.closestY = closestY;
    this.lookaheadX = lookaheadX;
    this.lookaheadY = lookaheadY;
    this.curvature = curvature;
    this.targetVel = targetVel;
    this.leftTargetVel = leftTargetVel;
    this.rightTargetVel = rightTargetVel;
    this.leftVel = leftVel;
    this.rightVel = rightVel;
  };
};


/**
 * @brief debugData class
 */
class DebugDataParams {
  /**
   * @brief constructor for debugDataParams
   * @param {number} maxVel - the maximum velocity of the robot
   * @param {number} trackWidth - the track width of the robot
   */
  constructor(maxVel, trackWidth) {
    this.maxVel = maxVel;
    this.trackWidth = trackWidth;
  };
};
