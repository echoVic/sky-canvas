/**
 * Math utilities for Sky Canvas SDK
 */

/**
 * 2D Vector class
 */
export class Vector2 {
  constructor(public x: number = 0, public y: number = 0) {}

  /**
   * Create a new Vector2 from coordinates
   */
  static create(x: number, y: number): Vector2 {
    return new Vector2(x, y);
  }

  /**
   * Create a zero vector
   */
  static zero(): Vector2 {
    return new Vector2(0, 0);
  }

  /**
   * Create a unit vector in X direction
   */
  static unitX(): Vector2 {
    return new Vector2(1, 0);
  }

  /**
   * Create a unit vector in Y direction
   */
  static unitY(): Vector2 {
    return new Vector2(0, 1);
  }

  /**
   * Calculate length of the vector
   */
  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  /**
   * Calculate squared length (faster than length for comparisons)
   */
  lengthSquared(): number {
    return this.x * this.x + this.y * this.y;
  }

  /**
   * Calculate distance to another vector
   */
  distance(other: Vector2): number {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate squared distance to another vector
   */
  distanceSquared(other: Vector2): number {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return dx * dx + dy * dy;
  }

  /**
   * Normalize the vector to unit length
   */
  normalize(): Vector2 {
    const length = this.length();
    if (length === 0) {
      return new Vector2(0, 0);
    }
    return new Vector2(this.x / length, this.y / length);
  }

  /**
   * Add another vector
   */
  add(other: Vector2): Vector2 {
    return new Vector2(this.x + other.x, this.y + other.y);
  }

  /**
   * Subtract another vector
   */
  subtract(other: Vector2): Vector2 {
    return new Vector2(this.x - other.x, this.y - other.y);
  }

  /**
   * Multiply by scalar
   */
  multiply(scalar: number): Vector2 {
    return new Vector2(this.x * scalar, this.y * scalar);
  }

  /**
   * Multiply by scalar (alias for multiply)
   */
  multiplyScalar(scalar: number): Vector2 {
    return this.multiply(scalar);
  }

  /**
   * Divide by scalar
   */
  divide(scalar: number): Vector2 {
    if (scalar === 0) {
      throw new Error("Division by zero");
    }
    return new Vector2(this.x / scalar, this.y / scalar);
  }

  /**
   * Dot product with another vector
   */
  dot(other: Vector2): number {
    return this.x * other.x + this.y * other.y;
  }

  /**
   * Cross product with another vector (returns scalar)
   */
  cross(other: Vector2): number {
    return this.x * other.y - this.y * other.x;
  }

  /**
   * Rotate by angle in radians
   */
  rotate(angle: number): Vector2 {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return new Vector2(
      this.x * cos - this.y * sin,
      this.x * sin + this.y * cos
    );
  }

  /**
   * Create a clone of this vector
   */
  clone(): Vector2 {
    return new Vector2(this.x, this.y);
  }

  /**
   * Convert to string representation
   */
  toString(): string {
    return `Vector2(${this.x}, ${this.y})`;
  }

  /**
   * Check equality with another vector
   */
  equals(other: Vector2, tolerance: number = 1e-6): boolean {
    return Math.abs(this.x - other.x) < tolerance && 
           Math.abs(this.y - other.y) < tolerance;
  }
}

/**
 * 2D Transform class for representing scale, rotation, and translation
 */
export class Transform {
  constructor(
    public scale: Vector2 = new Vector2(1, 1),
    public rotation: number = 0,
    public translation: Vector2 = new Vector2(0, 0)
  ) {}

  /**
   * Create an identity transform
   */
  static identity(): Transform {
    return new Transform();
  }

  /**
   * Create a translation transform
   */
  static translate(x: number, y: number): Transform {
    return new Transform(new Vector2(1, 1), 0, new Vector2(x, y));
  }

  /**
   * Create a rotation transform
   */
  static rotate(angle: number): Transform {
    return new Transform(new Vector2(1, 1), angle, new Vector2(0, 0));
  }

  /**
   * Create a scale transform
   */
  static scaleUniform(scale: number): Transform {
    return new Transform(new Vector2(scale, scale), 0, new Vector2(0, 0));
  }

  /**
   * Create a non-uniform scale transform
   */
  static scaleNonUniform(scaleX: number, scaleY: number): Transform {
    return new Transform(new Vector2(scaleX, scaleY), 0, new Vector2(0, 0));
  }

  /**
   * Apply transform to a point
   */
  transformPoint(point: Vector2): Vector2 {
    // First scale
    let transformed = new Vector2(point.x * this.scale.x, point.y * this.scale.y);
    
    // Then rotate
    if (this.rotation !== 0) {
      transformed = transformed.rotate(this.rotation);
    }
    
    // Finally translate
    return transformed.add(this.translation);
  }

  /**
   * Apply inverse transform to a point
   */
  inverseTransformPoint(point: Vector2): Vector2 {
    // First translate back
    let transformed = point.subtract(this.translation);
    
    // Then rotate back
    if (this.rotation !== 0) {
      transformed = transformed.rotate(-this.rotation);
    }
    
    // Finally scale back
    return new Vector2(transformed.x / this.scale.x, transformed.y / this.scale.y);
  }

  /**
   * Combine with another transform
   */
  combine(other: Transform): Transform {
    const newScale = new Vector2(
      this.scale.x * other.scale.x,
      this.scale.y * other.scale.y
    );
    const newRotation = this.rotation + other.rotation;
    const newTranslation = this.transformPoint(other.translation);
    
    return new Transform(newScale, newRotation, newTranslation);
  }

  /**
   * Create inverse transform
   */
  inverse(): Transform {
    const invScale = new Vector2(1 / this.scale.x, 1 / this.scale.y);
    const invRotation = -this.rotation;
    const invTranslation = this.translation.multiply(-1).rotate(-this.rotation);
    invTranslation.x /= this.scale.x;
    invTranslation.y /= this.scale.y;
    
    return new Transform(invScale, invRotation, invTranslation);
  }

  /**
   * Clone this transform
   */
  clone(): Transform {
    return new Transform(this.scale.clone(), this.rotation, this.translation.clone());
  }

  /**
   * Convert to matrix representation
   */
  toMatrix(): number[] {
    const cos = Math.cos(this.rotation);
    const sin = Math.sin(this.rotation);
    
    return [
      this.scale.x * cos, -this.scale.x * sin, this.translation.x,
      this.scale.y * sin,  this.scale.y * cos, this.translation.y,
      0, 0, 1
    ];
  }

  /**
   * Create from matrix
   */
  static fromMatrix(matrix: number[]): Transform {
    if (!matrix || matrix.length < 6) {
      throw new Error('Invalid matrix: must be an array with at least 6 elements');
    }
    const scaleX = Math.sqrt(matrix[0]! * matrix[0]! + matrix[3]! * matrix[3]!);
    const scaleY = Math.sqrt(matrix[1]! * matrix[1]! + matrix[4]! * matrix[4]!);
    const rotation = Math.atan2(matrix[3]!, matrix[0]!);
    const translation = new Vector2(matrix[2]!, matrix[5]!);
    
    return new Transform(new Vector2(scaleX, scaleY), rotation, translation);
  }
}

/**
 * Math utility functions
 */
export class MathUtils {
  /**
   * Convert degrees to radians
   */
  static degToRad(degrees: number): number {
    return degrees * Math.PI / 180;
  }

  /**
   * Convert radians to degrees
   */
  static radToDeg(radians: number): number {
    return radians * 180 / Math.PI;
  }

  /**
   * Clamp value between min and max
   */
  static clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  /**
   * Linear interpolation
   */
  static lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  /**
   * Check if value is approximately equal to another value
   */
  static approximately(a: number, b: number, tolerance: number = 1e-6): boolean {
    return Math.abs(a - b) < tolerance;
  }
}
